import { loadEnv } from './common/load-env';

loadEnv();
// The e2e suite wipes orders and requests, so it must never run against a real database.
const url = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL || '';
if (!/\/[^/?]*test[^/?]*(\?|$)/i.test(url)) {
  throw new Error('Refusing to run e2e tests: set DATABASE_URL_TEST to a database whose name contains "test" (e.g. flowtus_test).');
}
process.env.DATABASE_URL = url;
process.env.NODE_ENV = 'test';
