import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
// CommonJS: el default import de 'twilio' falla en runtime con Nest/tsc
// eslint-disable-next-line @typescript-eslint/no-require-imports
const twilioSdk = require('twilio') as (
  accountSid: string,
  authToken: string,
) => import('twilio').Twilio;
import {
  WhatsappMessage,
  WhatsappDirection,
  WhatsappMessageStatus,
} from './whatsapp-message.entity';
import { normalizePhoneToE164, toWhatsappAddress } from './phone.util';
import { SettingsService } from '../settings/settings.service';
import { WhatsappContentService } from './whatsapp-content.service';
import { Patient } from '../patients/patient.entity';
import { Appointment } from '../appointments/appointment.entity';

export interface SendWhatsappResult {
  ok: boolean;
  simulated?: boolean;
  message: string;
  messageId?: string;
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private client: import('twilio').Twilio | null = null;

  constructor(
    @InjectRepository(WhatsappMessage)
    private readonly messageRepo: Repository<WhatsappMessage>,
    private readonly config: ConfigService,
    private readonly settingsService: SettingsService,
    private readonly contentService: WhatsappContentService,
  ) {
    this.initClient();
  }

  private initClient() {
    const sid = this.config.get('TWILIO_ACCOUNT_SID');
    const token = this.config.get('TWILIO_AUTH_TOKEN');
    if (sid && token) {
      this.client = twilioSdk(sid, token);
      this.logger.log('Twilio WhatsApp client inicializado');
    } else {
      this.logger.warn('Twilio no configurado — WhatsApp en modo simulado');
    }
  }

  isConfigured(): boolean {
    return !!(
      this.client &&
      this.config.get('TWILIO_WHATSAPP_NUMBER')
    );
  }

  getFromNumber(): string {
    const num = this.config.get('TWILIO_WHATSAPP_NUMBER', '');
    return num.startsWith('whatsapp:') ? num : `whatsapp:${num}`;
  }

  async getStats() {
    const [sent, failed, received] = await Promise.all([
      this.messageRepo.count({
        where: { direction: WhatsappDirection.OUTBOUND, status: WhatsappMessageStatus.SENT },
      }),
      this.messageRepo.count({
        where: { direction: WhatsappDirection.OUTBOUND, status: WhatsappMessageStatus.FAILED },
      }),
      this.messageRepo.count({
        where: { direction: WhatsappDirection.INBOUND },
      }),
    ]);
    return { sent, failed, received, configured: this.isConfigured() };
  }

  private async isWhatsappEnabled(): Promise<boolean> {
    const v = await this.settingsService.get('whatsapp_enabled');
    return v !== 'false';
  }

  formatAppointmentDate(scheduledAt: Date): { date: string; time: string } {
    return {
      date: scheduledAt.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
      time: scheduledAt.toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
    };
  }

  buildCreationMessage(patient: Patient, apt: Appointment): string {
    const { date, time } = this.formatAppointmentDate(new Date(apt.scheduledAt));
    return (
      `Hola ${patient.firstName}.\n\n` +
      `Su turno fue registrado.\n\n` +
      `Fecha: ${date}\n` +
      `Hora: ${time}\n\n` +
      `Use los botones: Confirmar, Cancelar o Reprogramar.`
    );
  }

  buildReminderMessage(patient: Patient, apt: Appointment): string {
    const { date, time } = this.formatAppointmentDate(new Date(apt.scheduledAt));
    return (
      `Le recordamos su turno odontológico.\n\n` +
      `Fecha: ${date}\n` +
      `Hora: ${time}\n\n` +
      `Use los botones: Confirmar, Cancelar o Reprogramar.`
    );
  }

  private contentVariables(patient: Patient, apt: Appointment): Record<string, string> {
    const { date, time } = this.formatAppointmentDate(new Date(apt.scheduledAt));
    return { '1': patient.firstName, '2': date, '3': time };
  }

  buildCancellationMessage(patient: Patient, apt: Appointment): string {
    const { date, time } = this.formatAppointmentDate(new Date(apt.scheduledAt));
    return (
      `Hola ${patient.firstName}.\n\n` +
      `Su turno del ${date} a las ${time} hs fue cancelado.\n\n` +
      `Para reprogramar, contacte al consultorio.`
    );
  }

  async sendInteractiveToPatient(params: {
    patient: Patient;
    appointmentId?: string;
    contentSid: string;
    contentVariables: Record<string, string>;
    fallbackBody: string;
  }): Promise<SendWhatsappResult> {
    return this.sendToPatient({
      patient: params.patient,
      appointmentId: params.appointmentId,
      body: params.fallbackBody,
      contentSid: params.contentSid,
      contentVariables: params.contentVariables,
    });
  }

  async sendToPatient(params: {
    patient: Patient;
    body: string;
    appointmentId?: string;
    contentSid?: string;
    contentVariables?: Record<string, string>;
  }): Promise<SendWhatsappResult> {
    if (!(await this.isWhatsappEnabled())) {
      return { ok: false, message: 'WhatsApp desactivado en configuración' };
    }

    if (params.patient.acceptsWhatsapp === false) {
      return { ok: false, message: 'El paciente no acepta WhatsApp' };
    }

    const e164 = normalizePhoneToE164(params.patient.phone);
    if (!e164) {
      return { ok: false, message: 'Teléfono del paciente inválido para WhatsApp' };
    }

    const logMessage = params.contentSid
      ? `[botones] ${params.body}`
      : params.body;

    const log = this.messageRepo.create({
      patientId: params.patient.id,
      appointmentId: params.appointmentId,
      direction: WhatsappDirection.OUTBOUND,
      message: logMessage,
      status: WhatsappMessageStatus.QUEUED,
    });
    await this.messageRepo.save(log);

    const to = toWhatsappAddress(e164);
    const from = this.getFromNumber();

    try {
      if (!this.client || !from) {
        this.logger.warn(`[SIMULADO WA] → ${to}: ${params.body.slice(0, 80)}…`);
        log.status = WhatsappMessageStatus.SENT;
        log.twilioSid = `simulated-${Date.now()}`;
        await this.messageRepo.save(log);
        return {
          ok: true,
          simulated: true,
          message: 'WhatsApp simulado (configurá Twilio en .env)',
          messageId: log.id,
        };
      }

      const msg = params.contentSid
        ? await this.client.messages.create({
            from,
            to,
            contentSid: params.contentSid,
            contentVariables: JSON.stringify(params.contentVariables ?? {}),
          })
        : await this.client.messages.create({
            from,
            to,
            body: params.body,
          });

      log.status = WhatsappMessageStatus.SENT;
      log.twilioSid = msg.sid;
      await this.messageRepo.save(log);

      if (params.appointmentId) {
        await this.messageRepo.manager.update(
          Appointment,
          { id: params.appointmentId },
          { whatsappStatus: 'sent' },
        );
      }

      this.logger.log(`WhatsApp enviado a ${to} [${msg.sid}]`);
      return { ok: true, message: 'WhatsApp enviado', messageId: log.id };
    } catch (err: any) {
      log.status = WhatsappMessageStatus.FAILED;
      log.errorMessage = err.message;
      await this.messageRepo.save(log);
      this.logger.error(`Error WhatsApp: ${err.message}`);
      return { ok: false, message: err.message ?? 'Error al enviar WhatsApp' };
    }
  }

  async sendAppointmentCreated(patient: Patient, apt: Appointment) {
    const auto = await this.settingsService.get('whatsapp_auto_on_create');
    if (auto === 'false') return { ok: false, message: 'Confirmación automática desactivada' };

    const fallbackBody = this.buildCreationMessage(patient, apt);
    const contentSid = await this.contentService.getAppointmentContentSid();
    if (contentSid) {
      return this.sendInteractiveToPatient({
        patient,
        appointmentId: apt.id,
        contentSid,
        contentVariables: this.contentVariables(patient, apt),
        fallbackBody,
      });
    }
    return this.sendToPatient({ patient, appointmentId: apt.id, body: fallbackBody });
  }

  async sendAppointmentReminder(patient: Patient, apt: Appointment) {
    const fallbackBody = this.buildReminderMessage(patient, apt);
    const contentSid = await this.contentService.getReminderContentSid();
    if (contentSid) {
      return this.sendInteractiveToPatient({
        patient,
        appointmentId: apt.id,
        contentSid,
        contentVariables: this.contentVariables(patient, apt),
        fallbackBody,
      });
    }
    return this.sendToPatient({ patient, appointmentId: apt.id, body: fallbackBody });
  }

  async sendAppointmentCancelled(patient: Patient, apt: Appointment) {
    return this.sendToPatient({
      patient,
      appointmentId: apt.id,
      body: this.buildCancellationMessage(patient, apt),
    });
  }

  async logInbound(params: {
    patientId: string;
    appointmentId?: string;
    message: string;
    twilioSid?: string;
  }) {
    return this.messageRepo.save(
      this.messageRepo.create({
        patientId: params.patientId,
        appointmentId: params.appointmentId,
        direction: WhatsappDirection.INBOUND,
        message: params.message,
        status: WhatsappMessageStatus.RECEIVED,
        twilioSid: params.twilioSid,
      }),
    );
  }

  async listMessages(filters: {
    direction?: WhatsappDirection;
    status?: WhatsappMessageStatus;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 25, 100);
    const qb = this.messageRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.patient', 'patient')
      .orderBy('m.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filters.direction) qb.andWhere('m.direction = :dir', { dir: filters.direction });
    if (filters.status) qb.andWhere('m.status = :st', { st: filters.status });

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }
}
