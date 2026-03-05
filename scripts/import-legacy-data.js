import pg from 'pg';

const IMPORT_CONFIG = {
  host: process.env['IMPORT_PG_HOST'],
  port: Number(process.env['IMPORT_PG_PORT'] || 5432),
  database: process.env['IMPORT_PG_DATABASE'],
  user: process.env['IMPORT_PG_USER'],
  password: process.env['IMPORT_PG_PASSWORD'],
};
const TARGET_CONFIG = {
  host: process.env['PG_HOST'],
  port: Number(process.env['PG_PORT'] || 5432),
  database: process.env['PG_DATABASE'],
  user: process.env['PG_USER'],
  password: process.env['PG_PASSWORD'],
};
// Mapping old project IDs to new product keys
const PROJECT_MAPPING = {
  'd64016ed-a939-4b7b-b49c-2bc82f495b63': { key: 'smartpricing', name: 'Smartpricing' },
  '5b7e04d6-718d-400e-a5a5-7e6dbddd6022': { key: 'smartfree', name: 'Smartfree' },
  '4e28fe34-62a0-47ab-a6f6-15f62f2a4370': { key: 'smartconnect', name: 'Smartconnect' },
};
async function main() {
  console.log('Starting legacy data import...');
  const sourceClient = new pg.Client(IMPORT_CONFIG);
  const targetClient = new pg.Client(TARGET_CONFIG);
  try {
    await sourceClient.connect();
    console.log('Connected to source database');
    await targetClient.connect();
    console.log('Connected to target database');
    // Step 1: Insert products
    await insertProducts(targetClient);
    // Step 2: Import features and build mapping
    const featureMapping = await importFeatures(sourceClient, targetClient);
    // Step 3: Import interactions
    await importInteractions(sourceClient, targetClient, featureMapping);
    // Step 4: Import feedbacks
    await importFeedbacks(sourceClient, targetClient, featureMapping);
    console.log('Import completed successfully!');
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  } finally {
    await sourceClient.end();
    await targetClient.end();
  }
}
async function insertProducts(targetClient) {
  console.log('Inserting products...');
  for (const [_projectId, product] of Object.entries(PROJECT_MAPPING)) {
    await targetClient.query(
      `INSERT INTO csat.product (key, name)
       VALUES ($1, $2)
       ON CONFLICT (key) DO NOTHING`,
      [product.key, product.name],
    );
  }
  console.log(`Inserted ${Object.keys(PROJECT_MAPPING).length} products`);
}
async function importFeatures(sourceClient, targetClient) {
  console.log('Importing features...');
  // Get features with their project info
  const result = await sourceClient.query(`
    SELECT 
      fe.id,
      fe.event_key,
      fe.description,
      fe.max_triggers,
      fe.max_rejections,
      f.uuid as project_uuid
    FROM feedback.feature_event fe
    JOIN feedback.feature f ON f.id = fe.feature_id
    WHERE f.uuid IN ('d64016ed-a939-4b7b-b49c-2bc82f495b63', '5b7e04d6-718d-400e-a5a5-7e6dbddd6022', '4e28fe34-62a0-47ab-a6f6-15f62f2a4370')
      AND fe.is_disabled = false
  `);
  const featureMapping = new Map();
  for (const row of result.rows) {
    const product = PROJECT_MAPPING[row.project_uuid];
    if (!product) continue;
    const featureKey = row.event_key || `feature-${row.id}`;
    const insertResult = await targetClient.query(
      `INSERT INTO csat.product_feature (product_key, key, description, interaction_threshold, rejection_threshold)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (product_key, key) DO UPDATE SET description = EXCLUDED.description
       RETURNING id`,
      [product.key, featureKey, row.description, row.max_triggers || 5, row.max_rejections || 3],
    );
    featureMapping.set(row.id, insertResult.rows[0].id);
  }
  console.log(`Imported ${featureMapping.size} features`);
  return featureMapping;
}
async function importInteractions(sourceClient, targetClient, featureMapping) {
  console.log('Importing interactions...');
  const result = await sourceClient.query(`
    SELECT 
      ufi.user_id,
      ufi.feature_event_id,
      ufi.rejections_count,
      ufi.interactions_before_trigger_count,
      ufi.created_at,
      ufi.updated_at,
      u.email as user_email
    FROM feedback.user_feature_event_interactions ufi
    JOIN athena.users u ON u.id = ufi.user_id
    WHERE ufi.feature_event_id IN (
      SELECT fe.id FROM feedback.feature_event fe
      JOIN feedback.feature f ON f.id = fe.feature_id
      WHERE f.uuid IN ('d64016ed-a939-4b7b-b49c-2bc82f495b63', '5b7e04d6-718d-400e-a5a5-7e6dbddd6022', '4e28fe34-62a0-47ab-a6f6-15f62f2a4370')
    )
  `);
  let imported = 0;
  let skipped = 0;
  for (const row of result.rows) {
    const productFeatureId = featureMapping.get(row.feature_event_id);
    if (!productFeatureId) {
      skipped++;
      continue;
    }
    await targetClient.query(
      `INSERT INTO csat.user_feature_interaction 
       (user_email, product_feature_id, interaction_count, total_interaction_count, rejection_count, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_email, product_feature_id) DO UPDATE SET
         interaction_count = EXCLUDED.interaction_count,
         total_interaction_count = EXCLUDED.total_interaction_count,
         rejection_count = EXCLUDED.rejection_count,
         updated_at = EXCLUDED.updated_at`,
      [
        row.user_email,
        productFeatureId,
        row.interactions_before_trigger_count,
        row.interactions_before_trigger_count,
        row.rejections_count,
        row.created_at,
        row.updated_at,
      ],
    );
    imported++;
  }
  console.log(`Imported ${imported} interactions (skipped ${skipped})`);
}
async function importFeedbacks(sourceClient, targetClient, featureMapping) {
  console.log('Importing feedbacks...');
  const result = await sourceClient.query(`
    SELECT 
      uf.feature_event_id,
      uf.user_id,
      uf.feedback_score,
      uf.feedback_comment,
      uf.created_at,
      u.email as user_email
    FROM feedback.user_feedback uf
    JOIN athena.users u ON u.id = uf.user_id
    WHERE uf.feature_event_id IN (
      SELECT fe.id FROM feedback.feature_event fe
      JOIN feedback.feature f ON f.id = fe.feature_id
      WHERE f.uuid IN ('d64016ed-a939-4b7b-b49c-2bc82f495b63', '5b7e04d6-718d-400e-a5a5-7e6dbddd6022', '4e28fe34-62a0-47ab-a6f6-15f62f2a4370')
    )
  `);
  let imported = 0;
  let skipped = 0;
  for (const row of result.rows) {
    const productFeatureId = featureMapping.get(row.feature_event_id);
    if (!productFeatureId) {
      skipped++;
      continue;
    }
    await targetClient.query(
      `INSERT INTO csat.user_feedback 
       (user_email, product_feature_id, rating, comment, source, state, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [row.user_email, productFeatureId, row.feedback_score, row.feedback_comment, 'prompted', 'DONE', row.created_at],
    );
    imported++;
  }
  console.log(`Imported ${imported} feedbacks (skipped ${skipped})`);
}
main();
