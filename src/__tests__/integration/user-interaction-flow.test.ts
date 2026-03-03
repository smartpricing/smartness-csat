import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TestServerManager } from '../setup/TestServerManager.js';

describe('User Interaction Flow', () => {
  let pool: Pool;
  const testServerManager = new TestServerManager();
  const userEmail = 'user@example.com';
  const productKey = 'test-product';
  const featureKey = 'test-feature';

  beforeAll(async () => {
    pool = new Pool({
      host: process.env['PG_HOST'],
      port: Number(process.env['PG_PORT']),
      user: process.env['PG_USER'],
      password: process.env['PG_PASSWORD'],
      database: process.env['PG_DATABASE'],
    });

    await truncateAllTables(pool);
    await setupTestData(pool);
    await testServerManager.start();
  });

  afterAll(async () => {
    await testServerManager.stop();
    await pool.end();
  });

  it('should fetch interactions for user with no prior interactions', async () => {
    const response = await testServerManager.request
      ?.get(`/api/csat/v1/products/${productKey}/feature-interactions`)
      .query({ user_email: userEmail })
      .expect(200);

    expect(response?.body.data).toBeInstanceOf(Array);
    expect(response?.body.data.length).toBe(2);
    expect(response?.body.data[0].interaction_count).toBe(0);
    expect(response?.body.data[0].should_request_feedback).toBe(false);
  });

  it('should track 1st interaction - should NOT request feedback', async () => {
    const response = await testServerManager.request
      ?.post(`/api/csat/v1/products/${productKey}/features/${featureKey}/increment`)
      .send({ user_email: userEmail })
      .expect(200);

    expect(response?.body.interaction_count).toBe(1);
    expect(response?.body.interaction_threshold).toBe(3);
    expect(response?.body.should_request_feedback).toBe(false);
  });

  it('should track 2nd interaction - should NOT request feedback', async () => {
    const response = await testServerManager.request
      ?.post(`/api/csat/v1/products/${productKey}/features/${featureKey}/increment`)
      .send({ user_email: userEmail })
      .expect(200);

    expect(response?.body.interaction_count).toBe(2);
    expect(response?.body.should_request_feedback).toBe(false);
  });

  it('should track 3rd interaction - should request feedback (threshold reached)', async () => {
    const response = await testServerManager.request
      ?.post(`/api/csat/v1/products/${productKey}/features/${featureKey}/increment`)
      .send({ user_email: userEmail })
      .expect(200);

    expect(response?.body.interaction_count).toBe(3);
    expect(response?.body.rejection_count).toBe(0);
    expect(response?.body.should_request_feedback).toBe(true);
  });

  it('should reject the feedback prompt', async () => {
    const response = await testServerManager.request
      ?.post(`/api/csat/v1/products/${productKey}/features/${featureKey}/reject`)
      .send({ user_email: userEmail })
      .expect(200);

    expect(response?.body.rejection_count).toBe(1);
    expect(response?.body.interaction_count).toBe(0);
    expect(response?.body.total_interaction_count).toBe(3);
    expect(response?.body.should_request_feedback).toBe(false);
  });

  it('should track 4th interaction (1st after reset) - should NOT request feedback', async () => {
    const response = await testServerManager.request
      ?.post(`/api/csat/v1/products/${productKey}/features/${featureKey}/increment`)
      .send({ user_email: userEmail })
      .expect(200);

    expect(response?.body.interaction_count).toBe(1);
    expect(response?.body.total_interaction_count).toBe(4);
    expect(response?.body.rejection_count).toBe(1);
    expect(response?.body.should_request_feedback).toBe(false);
  });

  it('should track 5th interaction (2nd after reset) - should NOT request feedback', async () => {
    const response = await testServerManager.request
      ?.post(`/api/csat/v1/products/${productKey}/features/${featureKey}/increment`)
      .send({ user_email: userEmail })
      .expect(200);

    expect(response?.body.interaction_count).toBe(2);
    expect(response?.body.total_interaction_count).toBe(5);
    expect(response?.body.should_request_feedback).toBe(false);
  });

  it('should track 6th interaction (3rd after reset) - should request feedback again', async () => {
    const response = await testServerManager.request
      ?.post(`/api/csat/v1/products/${productKey}/features/${featureKey}/increment`)
      .send({ user_email: userEmail })
      .expect(200);

    expect(response?.body.interaction_count).toBe(3);
    expect(response?.body.total_interaction_count).toBe(6);
    expect(response?.body.rejection_count).toBe(1);
    expect(response?.body.should_request_feedback).toBe(true);
  });

  it('should submit feedback for the feature', async () => {
    const response = await testServerManager.request
      ?.post(`/api/csat/v1/products/${productKey}/features/${featureKey}/feedbacks`)
      .send({
        user_email: userEmail,
        rating: 8,
        comment: 'Great feature!',
        source: 'prompted',
        user_agent: 'Mozilla/5.0 (Test Browser)',
      })
      .expect(201);

    expect(response?.body.user_email).toBe(userEmail);
    expect(response?.body.rating).toBe(8);
    expect(response?.body.comment).toBe('Great feature!');
    expect(response?.body.source).toBe('prompted');
    expect(response?.body.user_agent).toBe('Mozilla/5.0 (Test Browser)');
  });

  it('should verify feedback was stored in database', async () => {
    const result = await pool.query(
      `SELECT uf.rating, uf.comment, uf.source, uf.user_agent
       FROM csat.user_feedback uf
       JOIN csat.product_feature pf ON pf.id = uf.product_feature_id
       WHERE uf.user_email = $1 AND pf.key = $2`,
      [userEmail, featureKey],
    );

    expect(result.rows.length).toBe(1);
    expect(result.rows[0].rating).toBe(8);
    expect(result.rows[0].comment).toBe('Great feature!');
    expect(result.rows[0].source).toBe('prompted');
    expect(result.rows[0].user_agent).toBe('Mozilla/5.0 (Test Browser)');
  });

  it('should refetch interactions after feedback submission', async () => {
    const response = await testServerManager.request
      ?.get(`/api/csat/v1/products/${productKey}/feature-interactions`)
      .query({ user_email: userEmail })
      .expect(200);

    expect(response?.body.data).toBeInstanceOf(Array);
    expect(response?.body.data.length).toBe(2);

    const feature = response?.body.data.find(
      (f: { product_feature_key: string }) => f.product_feature_key === featureKey,
    );
    expect(feature).toBeDefined();
    expect(feature.interaction_count).toBe(0);
    expect(feature.total_interaction_count).toBe(6);
    expect(feature.rejection_count).toBe(0);
    expect(feature.should_request_feedback).toBe(false);
  });

  it('should track interaction after feedback - only total_interaction_count increments (< 180 days)', async () => {
    const response = await testServerManager.request
      ?.post(`/api/csat/v1/products/${productKey}/features/${featureKey}/increment`)
      .send({ user_email: userEmail })
      .expect(200);

    expect(response?.body.interaction_count).toBe(0);
    expect(response?.body.total_interaction_count).toBe(7);
    expect(response?.body.rejection_count).toBe(0);
    expect(response?.body.should_request_feedback).toBe(false);
  });
});

async function truncateAllTables(pool: Pool): Promise<void> {
  await pool.query(`
    TRUNCATE TABLE csat.user_feedback CASCADE;
    TRUNCATE TABLE csat.user_feature_interaction CASCADE;
    TRUNCATE TABLE csat.product_feature CASCADE;
    TRUNCATE TABLE csat.product CASCADE;
  `);
}

async function setupTestData(pool: Pool): Promise<void> {
  await pool.query(`
    INSERT INTO csat.product (key, name) VALUES
      ('test-product', 'user-interaction-flow')
  `);

  await pool.query(`
    INSERT INTO csat.product_feature (product_key, key, description, interaction_threshold, rejection_threshold) VALUES
      ('test-product', 'test-feature', 'A test feature', 3, 2),
      ('test-product', 'test-feature-2', 'Another test feature', 3, 2)
  `);
}
