import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { AppointmentStatus } from '@dentaflow/shared';
import { Appointment } from '../appointments/appointment.entity';
import { WhatsappService } from './whatsapp.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class WhatsappReminderCron {
  private readonly logger = new Logger(WhatsappReminderCron.name);

  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    private readonly whatsappService: WhatsappService,
    private readonly settingsService: SettingsService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleReminders() {
    const settings = await this.settingsService.getAll();
    if (settings['whatsapp_enabled'] === 'false') return;

    const now = Date.now();
    const windows = [
      {
        key: 'reminder_48h',
        waKey: 'whatsapp_reminder_48h',
        sentField: 'reminder48hSent' as const,
        hours: 48,
      },
      {
        key: 'reminder_24h',
        waKey: 'whatsapp_reminder_24h',
        sentField: 'reminder24hSent' as const,
        hours: 24,
      },
      {
        key: 'reminder_2h',
        waKey: 'whatsapp_reminder_2h',
        sentField: 'reminder2hSent' as const,
        hours: 2,
      },
    ];

    for (const w of windows) {
      if (settings[w.key] !== 'true') continue;
      if (settings[w.waKey] === 'false') continue;
      await this.processWindow(w.hours, w.sentField);
    }
  }

  private async processWindow(targetHours: number, sentField: 'reminder48hSent' | 'reminder24hSent' | 'reminder2hSent') {
    const now = Date.now();
    const minMs = (targetHours - 0.75) * 3600000;
    const maxMs = (targetHours + 0.75) * 3600000;
    const from = new Date(now + minMs);
    const to = new Date(now + maxMs);

    const appointments = await this.appointmentRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.patient', 'patient')
      .where('a.scheduledAt BETWEEN :from AND :to', { from, to })
      .andWhere('a.status IN (:...statuses)', {
        statuses: [
          AppointmentStatus.PENDING,
          AppointmentStatus.CONFIRMED,
          AppointmentStatus.CONFIRMED_BY_PATIENT,
        ],
      })
      .andWhere(`a.${sentField} = false`)
      .getMany();

    for (const apt of appointments) {
      if (!apt.patient) continue;
      if (sentField === 'reminder2hSent' && apt.status === AppointmentStatus.CONFIRMED_BY_PATIENT) {
        apt.reminder2hSent = true;
        await this.appointmentRepo.save(apt);
        continue;
      }

      const result = await this.whatsappService.sendAppointmentReminder(apt.patient, apt);
      if (result.ok) {
        apt[sentField] = true;
        apt.reminderSent = true;
        await this.appointmentRepo.save(apt);
        this.logger.log(`Recordatorio ${targetHours}h enviado — turno ${apt.id}`);
      }
    }
  }
}
