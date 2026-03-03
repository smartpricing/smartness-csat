import { TestPostgresContainer } from './testPostgresqlContainer.js';

let postgresContainer: TestPostgresContainer | null = null;

export const setup = async () => {
  postgresContainer = new TestPostgresContainer();
  await postgresContainer.start();
};

export const teardown = async () => {
  await postgresContainer?.stop();
};
