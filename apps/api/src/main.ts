import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configure } from './bootstrap';
import { config } from './common/config';

async function main() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  configure(app);
  app.enableShutdownHooks();
  await app.listen(config.port);
  console.log(`FLOWTUS API listening on http://localhost:${config.port}/api`);
}
main();
