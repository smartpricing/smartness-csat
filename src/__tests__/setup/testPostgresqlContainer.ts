import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';

export class TestPostgresContainer {
  private postgresContainer: StartedPostgreSqlContainer | null = null;
  private client: Pool | null = null;

  async start(): Promise<void> {
    if (this.postgresContainer) {
      return;
    }

    this.postgresContainer = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('test_db')
      .withUsername('test_user')
      .withPassword('test_password')
      .withExposedPorts({
        container: 5432,
        host: 5432,
      })
      .start();

    this.client = new Pool({
      host: this.postgresContainer.getHost(),
      port: this.postgresContainer.getMappedPort(5432),
      database: this.postgresContainer.getDatabase(),
      user: this.postgresContainer.getUsername(),
      password: this.postgresContainer.getPassword(),
      max: 10,
    });

    await this.client.query('SELECT 1');

    await this.runMigrations();
  }

  async stop(): Promise<void> {
    if (this.client) {
      await this.client.end();
      this.client = null;
    }

    if (this.postgresContainer) {
      await this.postgresContainer.stop();
      this.postgresContainer = null;
    }
  }

  getConnectionConfig() {
    if (!this.postgresContainer) {
      throw new Error('Container not started');
    }

    return {
      host: this.postgresContainer.getHost(),
      port: this.postgresContainer.getMappedPort(5432),
      database: this.postgresContainer.getDatabase(),
      user: this.postgresContainer.getUsername(),
      password: this.postgresContainer.getPassword(),
      ssl: false,
    };
  }

  async runMigrations(): Promise<void> {
    if (!this.client) {
      throw new Error('Database client not available');
    }

    const migrationsPath = join(__dirname, '../../../resources/migrations');

    try {
      const files = await readdir(migrationsPath);

      const sqlFiles = files.filter((file) => file.endsWith('.sql')).sort();

      console.log(`┌─── Running ${sqlFiles.length} migrations`);

      for (const file of sqlFiles) {
        const filePath = join(migrationsPath, file);
        const sqlContent = await readFile(filePath, 'utf-8');

        console.log(`├─ Executing migration: ${file}`);
        await this.client.query(sqlContent);
      }

      console.log('└─── All migrations completed successfully');
    } catch (error) {
      console.error('└─── Migration failed:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    if (!this.client) return;

    const allTables = await this.client.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'csat'
    `);

    console.log(`Truncating ${allTables.rows.length} tables`);
    for (const row of allTables.rows) {
      await this.client.query(`TRUNCATE TABLE csat."${row.tablename}" CASCADE`);
    }
  }
}
