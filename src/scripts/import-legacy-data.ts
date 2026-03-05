import axios from 'axios';
import pg from 'pg';

const API_GATEWAY_URL = process.env['API_GATEWAY_URL'];
const API_GATEWAY_TOKEN = process.env['API_GATEWAY_TOKEN'];

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
const PROJECT_MAPPING: Record<string, { key: string; name: string }> = {
  'd64016ed-a939-4b7b-b49c-2bc82f495b63': { key: 'smartpricing', name: 'Smartpricing' },
  '5b7e04d6-718d-400e-a5a5-7e6dbddd6022': { key: 'free', name: 'Free' },
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

    // Step 3: Fetch user emails via API
    const userEmails = await fetchUserEmails();

    // Step 4: Import interactions
    await importInteractions(sourceClient, targetClient, featureMapping, userEmails);

    // Step 5: Import feedbacks
    await importFeedbacks(sourceClient, targetClient, featureMapping, userEmails);

    console.log('Import completed successfully!');
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  } finally {
    await sourceClient.end();
    await targetClient.end();
  }
}

async function insertProducts(targetClient: pg.Client) {
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

async function importFeatures(
  sourceClient: pg.Client,
  targetClient: pg.Client,
): Promise<Map<number, string>> {
  console.log('Importing features...');

  // Get features with their project info
  const result = await sourceClient.query<{
    id: number;
    event_key: string;
    description: string | null;
    max_triggers: number | null;
    max_rejections: number | null;
    project_key: string;
  }>(`
    SELECT 
      fe.id,
      fe.event_key,
      fe.description,
      fe.max_triggers,
      fe.max_rejections,
      p.key as project_key
    FROM feedback.feature_event fe
    JOIN feedback.feature f ON f.id = fe.feature_id
    JOIN feedback.project p ON p.id = f.project_id
    WHERE p.key IN ('d64016ed-a939-4b7b-b49c-2bc82f495b63', '5b7e04d6-718d-400e-a5a5-7e6dbddd6022', '4e28fe34-62a0-47ab-a6f6-15f62f2a4370')
      AND fe.is_disabled = false
  `);

  const featureMapping = new Map<number, string>();

  for (const row of result.rows) {
    const product = PROJECT_MAPPING[row.project_key];
    if (!product) continue;

    const featureKey = row.event_key || `feature-${row.id}`;

    const insertResult = await targetClient.query<{ id: string }>(
      `INSERT INTO csat.product_feature (product_key, key, description, interaction_threshold, rejection_threshold)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (product_key, key) DO UPDATE SET description = EXCLUDED.description
       RETURNING id`,
      [
        product.key,
        featureKey,
        row.description,
        row.max_triggers || 5,
        row.max_rejections || 3,
      ],
    );

    featureMapping.set(row.id, insertResult.rows[0]!.id);
  }

  console.log(`Imported ${featureMapping.size} features`);
  return featureMapping;
}

async function fetchUserEmails(): Promise<Map<number, string>> {
  console.log('Fetching all user emails via API...');

  const response = await axios.get<{
    items: {
      metadata: { id: string };
      spec: { username: string };
    }[];
  }>(`${API_GATEWAY_URL}/api/user/v1/users`, {
    headers: {
      Authorization: `Bearer ${API_GATEWAY_TOKEN}`,
    },
  });

  const userEmails = new Map<number, string>();

  for (const user of response.data.items) {
    const userId = Number.parseInt(user.metadata.id, 10);
    const email = user.spec.username;

    if (userId && email) {
      userEmails.set(userId, email);
    }
  }

  console.log(`Fetched ${userEmails.size} user emails`);
  return userEmails;
}

async function importInteractions(
  sourceClient: pg.Client,
  targetClient: pg.Client,
  featureMapping: Map<number, string>,
  userEmails: Map<number, string>,
) {
  console.log('Importing interactions...');

  const featureEventIds = Array.from(featureMapping.keys());

  const result = await sourceClient.query<{
    user_id: number;
    feature_event_id: number;
    rejections_count: number;
    interactions_before_trigger_count: number;
    created_at: Date;
    updated_at: Date;
  }>(`
    SELECT 
      user_id,
      feature_event_id,
      rejections_count,
      interactions_before_trigger_count,
      created_at,
      updated_at
    FROM feedback.user_feature_event_interactions
    WHERE feature_event_id = ANY($1)
  `, [featureEventIds]);

  const batch: {
    userEmail: string;
    productFeatureId: string;
    interactionCount: number;
    rejectionCount: number;
    createdAt: Date;
    updatedAt: Date;
  }[] = [];

  let skipped = 0;

  for (const row of result.rows) {
    const productFeatureId = featureMapping.get(row.feature_event_id);
    const userEmail = userEmails.get(row.user_id);

    if (!productFeatureId || !userEmail) {
      skipped++;
      continue;
    }

    batch.push({
      userEmail,
      productFeatureId,
      interactionCount: row.interactions_before_trigger_count,
      rejectionCount: row.rejections_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  if (batch.length > 0) {
    await targetClient.query(
      `INSERT INTO csat.user_feature_interaction 
       (user_email, product_feature_id, interaction_count, total_interaction_count, rejection_count, created_at, updated_at)
       SELECT * FROM unnest(
         $1::text[],
         $2::uuid[],
         $3::int[],
         $4::int[],
         $5::int[],
         $6::timestamp[],
         $7::timestamp[]
       )
       ON CONFLICT (user_email, product_feature_id) DO UPDATE SET
         interaction_count = EXCLUDED.interaction_count,
         total_interaction_count = EXCLUDED.total_interaction_count,
         rejection_count = EXCLUDED.rejection_count,
         updated_at = EXCLUDED.updated_at`,
      [
        batch.map((b) => b.userEmail),
        batch.map((b) => b.productFeatureId),
        batch.map((b) => b.interactionCount),
        batch.map((b) => b.interactionCount),
        batch.map((b) => b.rejectionCount),
        batch.map((b) => b.createdAt),
        batch.map((b) => b.updatedAt),
      ],
    );
  }

  console.log(`Imported ${batch.length} interactions (skipped ${skipped})`);
}

async function importFeedbacks(
  sourceClient: pg.Client,
  targetClient: pg.Client,
  featureMapping: Map<number, string>,
  userEmails: Map<number, string>,
) {
  console.log('Importing feedbacks...');

  const featureEventIds = Array.from(featureMapping.keys());

  const result = await sourceClient.query<{
    feature_event_id: number;
    user_id: number;
    feedback_score: number;
    feedback_comment: string | null;
    created_at: Date;
  }>(`
    SELECT 
      feature_event_id,
      user_id,
      feedback_score,
      feedback_comment,
      created_at
    FROM feedback.user_feedback
    WHERE feature_event_id = ANY($1)
  `, [featureEventIds]);

  const batch: {
    userEmail: string;
    productFeatureId: string;
    rating: number;
    comment: string | null;
    createdAt: Date;
  }[] = [];

  let skipped = 0;

  for (const row of result.rows) {
    const productFeatureId = featureMapping.get(row.feature_event_id);
    const userEmail = userEmails.get(row.user_id);

    if (!productFeatureId || !userEmail) {
      skipped++;
      continue;
    }

    batch.push({
      userEmail,
      productFeatureId,
      rating: row.feedback_score,
      comment: row.feedback_comment,
      createdAt: row.created_at,
    });
  }

  if (batch.length > 0) {
    await targetClient.query(
      `INSERT INTO csat.user_feedback 
       (user_email, product_feature_id, rating, comment, source, state, created_at)
       SELECT 
         unnest($1::text[]),
         unnest($2::uuid[]),
         unnest($3::int[]),
         unnest($4::text[]),
         'prompted',
         'DONE',
         unnest($5::timestamp[])`,
      [
        batch.map((b) => b.userEmail),
        batch.map((b) => b.productFeatureId),
        batch.map((b) => b.rating),
        batch.map((b) => b.comment),
        batch.map((b) => b.createdAt),
      ],
    );
  }

  console.log(`Imported ${batch.length} feedbacks (skipped ${skipped})`);
}

main();
