import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsappMessage } from './whatsapp-message.entity';
import { InternalNotification } from './internal-notification.entity';
import { WhatsappService } from './whatsapp.service';
import { WhatsappContentService } from './whatsapp-content.service';
import { WhatsappInboundService } from './whatsapp-inbound.service';
import { InternalNotificationService } from './internal-notification.service';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappWebhookController } from './whatsapp-webhook.controller';
import { WhatsappReminderCron } from './whatsapp-reminder.cron';
import { Patient } from '../patients/patient.entity';
import { Appointment } from '../appointments/appointment.entity';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WhatsappMessage,
      InternalNotification,
      Patient,
      Appointment,
    ]),
    SettingsModule,
  ],
  providers: [
    WhatsappContentService,
    WhatsappService,
    WhatsappInboundService,
    InternalNotificationService,
    WhatsappReminderCron,
  ],
  controllers: [WhatsappController, WhatsappWebhookController],
  exports: [WhatsappService, InternalNotificationService],
})
export class WhatsappModule {}
