import { join } from 'node:path';
import { loadEnv } from './load-env';

loadEnv();

const isProd = process.env.NODE_ENV === 'production';

function secret(): string {
  const s = process.env.JWT_SECRET || '';
  if (isProd && (s.length < 32 || s.startsWith('change-me'))) {
    throw new Error('JWT_SECRET must be set to a long random value in production.');
  }
  return s || 'dev-only-secret-do-not-use-in-production';
}

export const config = {
  isProd,
  port: Number(process.env.PORT || 4000),
  jwtSecret: secret(),
  cookieName: 'ft_admin',
  sessionHours: 12,
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001').split(',').map((s) => s.trim()).filter(Boolean),
  uploadDir: process.env.UPLOAD_DIR ? join(process.cwd(), process.env.UPLOAD_DIR) : join(process.cwd(), 'uploads'),
  publicWebUrl: (process.env.PUBLIC_WEB_URL || 'http://localhost:3000').replace(/\/$/, ''),
  allowDemoTools: process.env.ALLOW_DEMO_TOOLS === 'true' && !isProd,
};
