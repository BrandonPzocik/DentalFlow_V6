import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import {
  NotificationLog, NotificationChannel,
  NotificationType, NotificationStatus,
} from './notification-log.entity';
import { Patient } from '../patients/patient.entity';
import { CLINIC_TIMEZONE, formatClinicTime } from '../../common/clinic-timezone';

export interface SendEmailResult {
  ok: boolean;
  simulated?: boolean;
  message: string;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  patientId?: string;
  appointmentId?: string;
  type?: NotificationType;
}

export interface AppointmentNotificationData {
  patientName: string;
  patientEmail?: string;
  dentistName: string;
  scheduledAt: Date;
  durationMinutes: number;
  treatmentType?: string;
  patientId: string;
  appointmentId: string;
  acceptsEmail?: boolean;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    @InjectRepository(NotificationLog)
    private readonly logRepo: Repository<NotificationLog>,
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
    private readonly config: ConfigService,
  ) {
    this.initTransporter();
  }

  private initTransporter() {
    const user = this.config.get('GMAIL_USER');
    const pass = this.config.get('GMAIL_APP_PASSWORD');

    if (!user || !pass) {
      this.logger.warn('Gmail no configurado — emails serán simulados');
      return;
    }

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });

    this.transporter.verify((err) => {
      if (err) {
        this.logger.error(`Gmail verify error: ${err.message}`);
        this.transporter = null;
      } else {
        this.logger.log(`✉️  Gmail conectado como ${user}`);
      }
    });
  }

  async sendEmail(opts: SendEmailOptions): Promise<SendEmailResult> {
    const log = this.logRepo.create({
      patientId: opts.patientId,
      appointmentId: opts.appointmentId,
      channel: NotificationChannel.EMAIL,
      type: opts.type ?? NotificationType.CUSTOM,
      recipient: opts.to,
      subject: opts.subject,
      body: opts.html,
      status: NotificationStatus.PENDING,
    });

    try {
      const fromName = this.config.get('CLINIC_NAME', 'DentaFlow');
      const fromEmail = this.config.get('GMAIL_USER', 'noreply@gmail.com');

      if (!this.transporter) {
        this.logger.warn(`[SIMULADO] Email a ${opts.to} — Asunto: ${opts.subject}`);
        log.status = NotificationStatus.SENT;
        log.externalId = `simulated-${Date.now()}`;
        await this.logRepo.save(log);
        return {
          ok: true,
          simulated: true,
          message: 'Email simulado (configurá GMAIL_USER y GMAIL_APP_PASSWORD en .env)',
        };
      }

      const info = await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      });

      log.status = NotificationStatus.SENT;
      log.externalId = info.messageId;
      await this.logRepo.save(log);
      this.logger.log(`✉️  Email enviado a ${opts.to} [${info.messageId}]`);
      return { ok: true, message: `Email enviado a ${opts.to}` };
    } catch (err: any) {
      log.status = NotificationStatus.FAILED;
      log.errorMessage = err.message;
      await this.logRepo.save(log);
      this.logger.error(`❌ Error email a ${opts.to}: ${err.message}`);
      return { ok: false, message: err.message ?? 'Error al enviar email' };
    }
  }

  /** Envía un documento HTML al paciente (receta, presupuesto, factura, mensaje libre). */
  async sendDocumentToPatient(dto: {
    patientId: string;
    subject: string;
    html: string;
    type: NotificationType;
  }): Promise<SendEmailResult> {
    const patient = await this.patientRepo.findOne({ where: { id: dto.patientId } });
    if (!patient) throw new BadRequestException('Paciente no encontrado');
    if (patient.acceptsEmail === false) {
      throw new BadRequestException('El paciente no acepta comunicaciones por email');
    }
    if (!patient.email?.trim()) {
      throw new BadRequestException('El paciente no tiene email registrado');
    }

    const html =
      dto.html.trim().startsWith('<!DOCTYPE') || dto.html.trim().startsWith('<html')
        ? dto.html
        : this.wrapDocumentEmail(dto.html);

    return this.sendEmail({
      to: patient.email.trim(),
      subject: dto.subject,
      html,
      patientId: dto.patientId,
      type: dto.type,
    });
  }

  private wrapDocumentEmail(innerHtml: string): string {
    const clinicName = this.config.get('CLINIC_NAME', 'DentaFlow');
    return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif">
  <div style="max-width:640px;margin:24px auto 40px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06)">
    <div style="background:#0d9488;padding:16px 24px;color:#fff;font-size:14px;font-weight:600">${clinicName}</div>
    <div style="padding:8px 0">${innerHtml}</div>
    <div style="padding:16px 24px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center">
      Mensaje enviado desde ${clinicName} · DentaFlow
    </div>
  </div>
</body></html>`;
  }

  async notifyAppointmentCreated(data: AppointmentNotificationData): Promise<SendEmailResult | null> {
    if (data.acceptsEmail === false || !data.patientEmail?.trim()) {
      return null;
    }

    const dateStr = new Intl.DateTimeFormat('es-AR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      timeZone: CLINIC_TIMEZONE,
    }).format(data.scheduledAt);
    const timeStr = formatClinicTime(data.scheduledAt);
    const treatment = data.treatmentType ?? 'Consulta odontológica';
    const clinicName = this.config.get('CLINIC_NAME', 'DentaFlow');

    return this.sendEmail({
      to: data.patientEmail.trim(),
      subject: `Confirmación de turno — ${dateStr}`,
      html: this.buildAppointmentEmailHtml({
        patientName: data.patientName,
        dentistName: data.dentistName,
        dateStr,
        timeStr,
        treatment,
        durationMinutes: data.durationMinutes,
        clinicName,
        isReminder: false,
      }),
      patientId: data.patientId,
      appointmentId: data.appointmentId,
      type: NotificationType.APPOINTMENT_CONFIRM,
    });
  }

  async sendAppointmentReminder(data: AppointmentNotificationData): Promise<SendEmailResult | null> {
    if (data.acceptsEmail === false || !data.patientEmail?.trim()) {
      return null;
    }

    const dateStr = new Intl.DateTimeFormat('es-AR', {
      weekday: 'long', day: 'numeric', month: 'long',
      timeZone: CLINIC_TIMEZONE,
    }).format(data.scheduledAt);
    const timeStr = formatClinicTime(data.scheduledAt);
    const treatment = data.treatmentType ?? 'Consulta odontológica';
    const clinicName = this.config.get('CLINIC_NAME', 'DentaFlow');

    return this.sendEmail({
      to: data.patientEmail.trim(),
      subject: `Recordatorio de turno — ${dateStr}`,
      html: this.buildAppointmentEmailHtml({
        patientName: data.patientName,
        dentistName: data.dentistName,
        dateStr,
        timeStr,
        treatment,
        durationMinutes: data.durationMinutes,
        clinicName,
        isReminder: true,
      }),
      patientId: data.patientId,
      appointmentId: data.appointmentId,
      type: NotificationType.APPOINTMENT_REMINDER,
    });
  }

  async sendCustomNotification(dto: {
    patientId: string;
    email?: string;
    subject: string;
    emailBody: string;
  }): Promise<SendEmailResult> {
    const to = dto.email?.trim();
    if (!to) {
      throw new BadRequestException('El paciente no tiene email');
    }
    return this.sendEmail({
      to,
      subject: dto.subject,
      html: `<div style="font-family:sans-serif;padding:24px;max-width:520px;line-height:1.5">${dto.emailBody}</div>`,
      patientId: dto.patientId,
      type: NotificationType.CUSTOM,
    });
  }

  async getLogs(filters: {
    patientId?: string;
    channel?: NotificationChannel;
    limit?: number;
  }) {
    const qb = this.logRepo
      .createQueryBuilder('log')
      .orderBy('log.sentAt', 'DESC');
    if (filters.patientId) qb.andWhere('log.patientId = :pid', { pid: filters.patientId });
    if (filters.channel) qb.andWhere('log.channel = :ch', { ch: filters.channel });
    return qb.take(filters.limit ?? 100).getMany();
  }

  async sendReminderWithConfirmation(
    data: AppointmentNotificationData & {
      confirmationToken: string;
      baseUrl: string;
    },
  ): Promise<SendEmailResult | null> {
    if (data.acceptsEmail === false || !data.patientEmail?.trim()) {
      return null;
    }

    const dateStr = new Intl.DateTimeFormat('es-AR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      timeZone: CLINIC_TIMEZONE,
    }).format(data.scheduledAt);
    const timeStr = formatClinicTime(data.scheduledAt);
    const treatment = data.treatmentType ?? 'Consulta odontológica';
    const clinicName = this.config.get('CLINIC_NAME', 'DentaFlow');
    const confirmUrl = `${data.baseUrl}/api/appointments/confirm/${data.confirmationToken}`;

    return this.sendEmail({
      to: data.patientEmail.trim(),
      subject: `Recordatorio de turno — confirmación de asistencia`,
      html: this.buildReminderConfirmHtml({
        patientName: data.patientName,
        dentistName: data.dentistName,
        dateStr,
        timeStr,
        treatment,
        durationMinutes: data.durationMinutes,
        clinicName,
        confirmUrl,
      }),
      patientId: data.patientId,
      appointmentId: data.appointmentId,
      type: NotificationType.APPOINTMENT_REMINDER,
    });
  }

  async sendCancellationNotification(
    data: AppointmentNotificationData & { reason?: string },
  ): Promise<SendEmailResult | null> {
    if (data.acceptsEmail === false || !data.patientEmail?.trim()) {
      return null;
    }

    const dateStr = new Intl.DateTimeFormat('es-AR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      timeZone: CLINIC_TIMEZONE,
    }).format(data.scheduledAt);
    const timeStr = formatClinicTime(data.scheduledAt);
    const clinicName = this.config.get('CLINIC_NAME', 'DentaFlow');

    return this.sendEmail({
      to: data.patientEmail.trim(),
      subject: `Turno cancelado — ${dateStr}`,
      html: this.buildCancellationHtml({
        patientName: data.patientName,
        dentistName: data.dentistName,
        dateStr,
        timeStr,
        treatment: data.treatmentType ?? 'Consulta',
        clinicName,
        reason: data.reason,
      }),
      patientId: data.patientId,
      appointmentId: data.appointmentId,
      type: NotificationType.APPOINTMENT_CANCEL,
    });
  }

  private emailDetailRow(label: string, value: string): string {
    return `<tr>
      <td style="padding:10px 12px 10px 0;color:#64748b;font-size:13px;vertical-align:top;width:110px;border-bottom:1px solid #e2e8f0">${label}</td>
      <td style="padding:10px 0;color:#1e293b;font-size:14px;vertical-align:top;border-bottom:1px solid #e2e8f0">${value}</td>
    </tr>`;
  }

  private buildAppointmentEmailHtml(d: {
    patientName: string;
    dentistName: string;
    dateStr: string;
    timeStr: string;
    treatment: string;
    durationMinutes: number;
    clinicName: string;
    isReminder: boolean;
  }): string {
    const title = d.isReminder ? 'Recordatorio de turno' : 'Confirmación de turno';
    const intro = d.isReminder
      ? 'Le recordamos los datos de su próximo turno:'
      : 'Su turno quedó registrado con los siguientes datos:';

    const details = [
      this.emailDetailRow('Fecha', `<span style="text-transform:capitalize">${d.dateStr}</span>`),
      this.emailDetailRow('Horario', `<strong>${d.timeStr} hs</strong> (${d.durationMinutes} minutos)`),
      this.emailDetailRow('Profesional', `Dr. ${d.dentistName}`),
      this.emailDetailRow('Prestación', d.treatment),
    ].join('');

    return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif">
  <div style="max-width:560px;margin:32px auto 48px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
    <div style="background:#1e293b;padding:24px 32px">
      <p style="margin:0 0 4px;color:#94a3b8;font-size:11px;letter-spacing:0.06em;text-transform:uppercase">${d.clinicName}</p>
      <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:600">${title}</h1>
    </div>
    <div style="padding:28px 32px">
      <p style="margin:0 0 8px;color:#334155;font-size:15px;line-height:1.5">
        Estimado/a <strong>${d.patientName}</strong>,
      </p>
      <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.6">${intro}</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:28px">${details}</table>
      <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6">
        Si necesita reprogramar o cancelar, le pedimos que nos contacte con anticipación.
      </p>
      <p style="margin:16px 0 0;color:#1e293b;font-size:13px;font-weight:600">${d.clinicName}</p>
    </div>
  </div>
</body>
</html>`;
  }

  private buildReminderConfirmHtml(d: {
    patientName: string;
    dentistName: string;
    dateStr: string;
    timeStr: string;
    treatment: string;
    durationMinutes: number;
    clinicName: string;
    confirmUrl: string;
  }): string {
    const details = [
      this.emailDetailRow('Fecha', `<span style="text-transform:capitalize">${d.dateStr}</span>`),
      this.emailDetailRow('Horario', `<strong>${d.timeStr} hs</strong> (${d.durationMinutes} minutos)`),
      this.emailDetailRow('Profesional', `Dr. ${d.dentistName}`),
      this.emailDetailRow('Prestación', d.treatment),
    ].join('');

    return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Recordatorio de turno</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif">
<div style="max-width:560px;margin:32px auto 48px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
  <div style="background:#1e293b;padding:24px 32px">
    <p style="margin:0 0 4px;color:#94a3b8;font-size:11px;letter-spacing:0.06em;text-transform:uppercase">${d.clinicName}</p>
    <h1 style="margin:0;color:#fff;font-size:18px;font-weight:600">Recordatorio de turno</h1>
    <p style="margin:8px 0 0;color:#cbd5e1;font-size:13px">Confirmación de asistencia</p>
  </div>
  <div style="padding:28px 32px">
    <p style="margin:0 0 8px;color:#334155;font-size:15px;line-height:1.5">
      Estimado/a <strong>${d.patientName}</strong>,
    </p>
    <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.6">
      Le escribimos para recordarle su próximo turno. Por favor confirme si asistirá:
    </p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:28px">${details}</table>
    <div style="text-align:center;margin-bottom:28px">
      <a href="${d.confirmUrl}"
         style="display:inline-block;background:#1e293b;color:#fff;text-decoration:none;
                padding:12px 28px;border-radius:6px;font-weight:600;font-size:14px">
        Confirmar asistencia
      </a>
    </div>
    <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;text-align:center">
      Si no puede asistir, le pedimos avisar con anticipación para reprogramar.
    </p>
    <p style="margin:16px 0 0;color:#1e293b;font-size:13px;font-weight:600;text-align:center">${d.clinicName}</p>
  </div>
</div></body></html>`;
  }

  private buildCancellationHtml(d: {
    patientName: string;
    dentistName: string;
    dateStr: string;
    timeStr: string;
    treatment: string;
    clinicName: string;
    reason?: string;
  }): string {
    const details = [
      this.emailDetailRow('Fecha', `<span style="text-transform:capitalize">${d.dateStr}</span>`),
      this.emailDetailRow('Horario', `${d.timeStr} hs`),
      this.emailDetailRow('Profesional', `Dr. ${d.dentistName}`),
      this.emailDetailRow('Prestación', d.treatment),
    ].join('');

    const reasonBlock = d.reason
      ? `<p style="margin:0 0 24px;padding:12px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;color:#475569"><strong>Motivo:</strong> ${d.reason}</p>`
      : '';

    return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Turno cancelado</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif">
<div style="max-width:560px;margin:32px auto 48px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
  <div style="background:#475569;padding:24px 32px">
    <p style="margin:0 0 4px;color:#cbd5e1;font-size:11px;letter-spacing:0.06em;text-transform:uppercase">${d.clinicName}</p>
    <h1 style="margin:0;color:#fff;font-size:18px;font-weight:600">Turno cancelado</h1>
  </div>
  <div style="padding:28px 32px">
    <p style="margin:0 0 8px;color:#334155;font-size:15px;line-height:1.5">
      Estimado/a <strong>${d.patientName}</strong>,
    </p>
    <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.6">
      Le informamos que el siguiente turno fue cancelado:
    </p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">${details}</table>
    ${reasonBlock}
    <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6">
      Para reprogramar, puede contactarnos cuando lo desee.
    </p>
    <p style="margin:16px 0 0;color:#1e293b;font-size:13px;font-weight:600">${d.clinicName}</p>
  </div>
</div></body></html>`;
  }
}
