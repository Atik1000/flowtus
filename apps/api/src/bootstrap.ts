import { INestApplication } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { config } from './common/config';

/** Shared by main.ts and the e2e tests so they run the same middleware. */
export function configure(app: NestExpressApplication): INestApplication {
  app.setGlobalPrefix('api');
  app.set('trust proxy', 1); // behind the Next.js rewrite / a load balancer: use X-Forwarded-For for rate limits
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(cookieParser());
  app.useBodyParser('json', { limit: '256kb' });
  app.enableCors({ origin: config.corsOrigins, credentials: true });
  return app;
}
