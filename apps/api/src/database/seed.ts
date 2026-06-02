import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { runSeed } from './run-seed';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  await runSeed(app);
  await app.close();
}

seed().catch((e) => {
  console.error('❌ Error en seed:', e);
  process.exit(1);
});
