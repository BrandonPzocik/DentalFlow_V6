import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TreatmentCatalog } from './treatment-catalog.entity';
import { TreatmentPlan } from './treatment-plan.entity';
import { TreatmentInstallment } from './treatment-installment.entity';
import { TreatmentPlansService } from './treatment-plans.service';
import { TreatmentPlansController } from './treatment-plans.controller';
import { Prescription } from '../prescriptions/prescription.entity';
import { Patient } from '../patients/patient.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TreatmentCatalog,
      TreatmentPlan,
      TreatmentInstallment,
      Prescription,
      Patient,
    ]),
    NotificationsModule,
    SettingsModule,
  ],
  providers: [TreatmentPlansService],
  controllers: [TreatmentPlansController],
  exports: [TreatmentPlansService],
})
export class TreatmentPlansModule {}
