import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TestServerManager } from '../setup/TestServerManager.js';

describe('Create Products and Features', () => {
  let pool: Pool;
  const testServerManager = new TestServerManager();

  beforeAll(async () => {
    pool = new Pool({
      host: process.env['PG_HOST'],
      port: Number(process.env['PG_PORT']),
      user: process.env['PG_USER'],
      password: process.env['PG_PASSWORD'],
      database: process.env['PG_DATABASE'],
    });

    await truncateAllTables(pool);
    await insertTestData(pool);
    await testServerManager.start();
  });

  afterAll(async () => {
    await testServerManager.stop();
    await pool.end();
  });

  it('should connect to the database', async () => {
    const result = await pool.query('SELECT 1 as value');
    expect(result.rows[0].value).toBe(1);
  });

  it('should have inserted 4 products', async () => {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM csat.product WHERE key LIKE 'product-%'`,
    );
    expect(Number(result.rows[0].count)).toBe(4);
  });

  it('should fetch all features via API', async () => {
    const response = await testServerManager.request?.get('/api/csat/v1/features').expect(200);

    expect(response?.body).toBeDefined();
    expect(response?.body.data).toBeInstanceOf(Array);
    expect(response?.body.data.length).toBeGreaterThan(0);
  });

  it('should fetch features filtered by product key', async () => {
    const response = await testServerManager.request
      ?.get('/api/csat/v1/features')
      .query({ product_key: 'product-alpha' })
      .expect(200);

    expect(response?.body.data).toBeInstanceOf(Array);
    expect(response?.body.data.length).toBe(2);
    expect(response?.body.data.every((f: { product_key: string }) => f.product_key === 'product-alpha')).toBe(true);
  });

  it('should fetch features for multiple products', async () => {
    const response = await testServerManager.request
      ?.get('/api/csat/v1/features')
      .query({ product_key: ['product-alpha', 'product-beta'] })
      .expect(200);

    expect(response?.body.data).toBeInstanceOf(Array);
    expect(response?.body.data.length).toBe(4);
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

async function insertTestData(pool: Pool): Promise<void> {
  await pool.query(`
    INSERT INTO csat.product (key, name) VALUES
      ('product-alpha', 'Product Alpha'),
      ('product-beta', 'Product Beta'),
      ('product-gamma', 'Product Gamma'),
      ('product-delta', 'Product Delta')
  `);

  await pool.query(`
    INSERT INTO csat.product_feature (product_key, key, description, interaction_threshold, rejection_threshold) VALUES
      ('product-alpha', 'feature-1', 'First feature for Product Alpha', 5, 2),
      ('product-alpha', 'feature-2', 'Second feature for Product Alpha', 10, 3),
      ('product-beta', 'feature-1', 'First feature for Product Beta', 8, 2),
      ('product-beta', 'feature-2', 'Second feature for Product Beta', 12, 4),
      ('product-gamma', 'feature-main', 'Main feature for Product Gamma', 15, 5),
      ('product-delta', 'feature-core', 'Core feature for Product Delta', 20, 6)
  `);
}
