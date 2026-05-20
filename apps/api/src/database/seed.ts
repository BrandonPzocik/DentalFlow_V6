import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../modules/users/users.service';
import { UserRole } from '@dentaflow/shared';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  console.log('🌱 Seeding database...');

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
    console.log(`✅ Usuario admin creado: ${admin.email}`);
  } catch (e: any) {
    if (e.message?.includes('registrado')) {
      console.log('ℹ️  Usuario admin ya existe, saltando...');
    } else {
      throw e;
    }
  }

  console.log('✅ Seed completado');
  await app.close();
}

seed().catch((e) => {
  console.error('❌ Error en seed:', e);
  process.exit(1);
});
