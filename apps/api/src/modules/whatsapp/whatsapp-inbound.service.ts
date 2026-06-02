import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThan } from 'typeorm';
import { AppointmentStatus } from '@dentaflow/shared';
import { Patient } from '../patients/patient.entity';
import { Appointment } from '../appointments/appointment.entity';
import { WhatsappService } from './whatsapp.service';
import { InternalNotificationService } from './internal-notification.service';
import { InternalNotificationType } from './internal-notification.entity';
import { fromTwilioWhatsappAddress, normalizePhoneToE164 } from './phone.util';

type InboundIntent = 'confirm' | 'cancel' | 'reschedule' | 'unknown';

@Injectable()
export class WhatsappInboundService {
  private readonly logger = new Logger(WhatsappInboundService.name);

  constructor(
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    private readonly whatsappService: WhatsappService,
    private readonly internalNotifications: InternalNotificationService,
  ) {}

  parseIntent(body: string, buttonPayload?: string): InboundIntent {
    const payload = (buttonPayload ?? '').trim().toLowerCase();
    if (payload === 'confirm') return 'confirm';
    if (payload === 'cancel') return 'cancel';
    if (payload === 'reschedule') return 'reschedule';

    const t = body.trim().toLowerCase();
    if (/^(1|si|sí|confirmar|confirmado|confirmo)$/.test(t)) return 'confirm';
    if (/^(2|cancelar|no puedo|no puedo asistir|cancelado)$/.test(t)) return 'cancel';
    if (/^(3|reprogramar|cambiar turno|reagendar)$/.test(t)) return 'reschedule';
    return 'unknown';
  }

  async findPatientByPhone(from: string): Promise<Patient | null> {
    const e164 = fromTwilioWhatsappAddress(from);
    const normalized = normalizePhoneToE164(e164) ?? e164.replace(/\D/g, '');
    const patients = await this.patientRepo.find();
    return (
      patients.find((p) => {
        const pNorm = normalizePhoneToE164(p.phone);
        return pNorm === normalized || p.phone.replace(/\D/g, '') === normalized;
      }) ?? null
    );
  }

  async findNextPendingAppointment(patientId: string): Promise<Appointment | null> {
    return this.appointmentRepo.findOne({
      where: {
        patientId,
        status: In([
          AppointmentStatus.PENDING,
          AppointmentStatus.CONFIRMED,
        ]),
        scheduledAt: MoreThan(new Date()),
      },
      order: { scheduledAt: 'ASC' },
      relations: ['patient', 'dentist'],
    });
  }

  /** Turno al que responde el paciente (último mensaje WA con botones enviado). */
  async findAppointmentForResponse(patientId: string): Promise<Appointment | null> {
    const awaiting = await this.appointmentRepo.findOne({
      where: {
        patientId,
        whatsappStatus: 'sent',
        scheduledAt: MoreThan(new Date()),
      },
      order: { scheduledAt: 'ASC' },
      relations: ['patient', 'dentist'],
    });
    if (awaiting) return awaiting;
    return this.findNextPendingAppointment(patientId);
  }

  async handleInbound(
    from: string,
    body: string,
    messageSid?: string,
    buttonPayload?: string,
  ): Promise<string> {
    const patient = await this.findPatientByPhone(from);
    if (!patient) {
      this.logger.warn(`WhatsApp de número desconocido: ${from}`);
      return 'No encontramos su registro. Contacte al consultorio.';
    }

    const apt = await this.findAppointmentForResponse(patient.id);
    const inboundLabel = buttonPayload
      ? `[${buttonPayload}] ${body}`.trim()
      : body;
    await this.whatsappService.logInbound({
      patientId: patient.id,
      appointmentId: apt?.id,
      message: inboundLabel,
      twilioSid: messageSid,
    });

    const intent = this.parseIntent(body, buttonPayload);
    if (!apt) {
      return 'No tiene turnos pendientes por confirmar. Contacte al consultorio si necesita ayuda.';
    }

    const fullName = `${patient.lastName}, ${patient.firstName}`;

    if (intent === 'confirm') {
      apt.status = AppointmentStatus.CONFIRMED_BY_PATIENT;
      apt.whatsappStatus = 'confirmed';
      await this.appointmentRepo.save(apt);

      await this.internalNotifications.create({
        type: InternalNotificationType.APPOINTMENT_CONFIRMED,
        title: 'Turno confirmado por WhatsApp',
        body: `${fullName} confirmó su turno.`,
        patientId: patient.id,
        appointmentId: apt.id,
      });

      const reply =
        'Gracias.\nSu asistencia fue confirmada correctamente.';
      await this.whatsappService.sendToPatient({
        patient,
        appointmentId: apt.id,
        body: reply,
      });
      return reply;
    }

    if (intent === 'cancel') {
      apt.status = AppointmentStatus.CANCELLED;
      apt.cancellationReason = 'Cancelado por paciente vía WhatsApp';
      apt.whatsappStatus = 'cancelled';
      await this.appointmentRepo.save(apt);

      await this.internalNotifications.create({
        type: InternalNotificationType.APPOINTMENT_CANCELLED,
        title: 'Turno cancelado por WhatsApp',
        body: `${fullName} canceló su turno.`,
        patientId: patient.id,
        appointmentId: apt.id,
      });

      const reply = 'Su turno fue cancelado correctamente.';
      await this.whatsappService.sendToPatient({
        patient,
        appointmentId: apt.id,
        body: reply,
      });
      return reply;
    }

    if (intent === 'reschedule') {
      apt.status = AppointmentStatus.CANCELLED;
      apt.cancellationReason = 'Solicita reprogramación por WhatsApp';
      apt.whatsappStatus = 'reschedule_requested';
      await this.appointmentRepo.save(apt);

      await this.internalNotifications.create({
        type: InternalNotificationType.APPOINTMENT_RESCHEDULE_REQUEST,
        title: 'Solicitud de reprogramación',
        body: `${fullName} solicitó reprogramar su turno.`,
        patientId: patient.id,
        appointmentId: apt.id,
      });

      const reply =
        'Hemos registrado su solicitud de reprogramación.\n\n' +
        'El consultorio se comunicará para coordinar una nueva fecha.';
      await this.whatsappService.sendToPatient({
        patient,
        appointmentId: apt.id,
        body: reply,
      });
      return reply;
    }

    return (
      'No entendimos su respuesta.\n\n' +
      'Toque un botón del mensaje anterior: Confirmar, Cancelar o Reprogramar.'
    );
  }
}
