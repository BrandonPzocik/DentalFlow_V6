import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PatientsModule } from './modules/patients/patients.module';
import { OdontogramModule } from './modules/odontogram/odontogram.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { BillingModule } from './modules/billing/billing.module';
import { SocialWorksModule } from './modules/social-works/social-works.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SettingsModule } from './modules/settings/settings.module';
import { StudiesModule } from './modules/studies/studies.module';
import { PrescriptionsModule } from './modules/prescriptions/prescriptions.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { TreatmentPlansModule } from './modules/treatment-plans/treatment-plans.module';
import { buildTypeOrmOptions } from './database/typeorm.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => buildTypeOrmOptions(config),
    }),
    AuthModule,
    UsersModule,
    PatientsModule,
    OdontogramModule,
    AppointmentsModule,
    BillingModule,
    SocialWorksModule,
    NotificationsModule,
    SettingsModule,
    StudiesModule,
    PrescriptionsModule,
    WhatsappModule,
    TreatmentPlansModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
