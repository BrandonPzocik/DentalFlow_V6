import { ConfigService } from '@nestjs/config';
import { DataSourceOptions } from 'typeorm';

export function buildTypeOrmOptions(config: ConfigService): DataSourceOptions {
  const synchronize =
    config.get('DB_SYNCHRONIZE') === 'true' ||
    config.get('NODE_ENV') !== 'production';

  const base: DataSourceOptions = {
    type: 'postgres',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize,
    logging: config.get('NODE_ENV') === 'development',
  };

  const databaseUrl = config.get<string>('DATABASE_URL');
  if (databaseUrl) {
    return {
      ...base,
      url: databaseUrl,
      ssl: { rejectUnauthorized: false },
    };
  }

  return {
    ...base,
    host: config.get<string>('DB_HOST', 'localhost'),
    port: config.get<number>('DB_PORT', 5432),
    username: config.get<string>('DB_USER', 'dentaflow'),
    password: config.get<string>('DB_PASS', 'dentaflow_secret'),
    database: config.get<string>('DB_NAME', 'dentaflow'),
  };
}
