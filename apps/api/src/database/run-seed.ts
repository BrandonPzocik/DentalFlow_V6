import { INestApplicationContext, Logger } from '@nestjs/common';
import { UserRole } from '@dentaflow/shared';
import { UsersService } from '../modules/users/users.service';

const logger = new Logger('Seed');

export async function runSeed(app: INestApplicationContext): Promise<void> {
  const usersService = app.get(UsersService);
  logger.log('Verificando usuario admin inicial...');

  try {
    const admin = await usersService.create({
      firstName: 'Admin',
      lastName: 'DentaFlow',
      email: 'admin@dentaflow.com',
      password: 'Admin123!',
      role: UserRole.DENTIST_OWNER,
      specialty: 'Odontología General',
      licenseNumber: '12345',
    });
    logger.log(`Usuario admin creado: ${admin.email}`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('registrado')) {
      logger.log('Usuario admin ya existe');
      return;
    }
    throw e;
  }
}
