import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Appointment } from './appointment.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AppointmentStatus } from '@dentaflow/shared';
import { NotificationsService } from '../notifications/notifications.service';
import { PatientsService } from '../patients/patients.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly repo: Repository<Appointment>,
    private readonly notificationsService: NotificationsService,
    private readonly patientsService: PatientsService,
    private readonly whatsappService: WhatsappService,
    private readonly config: ConfigService,
  ) {}

  async findByDateRange(from: Date, to: Date, dentistId?: string) {
    const where: any = { scheduledAt: Between(from, to) };
    if (dentistId) where.dentistId = dentistId;
    return this.repo.find({
      where,
      relations: ['patient', 'dentist'],
      order: { scheduledAt: 'ASC' },
    });
  }

  async findByPatient(patientId: string) {
    return this.repo.find({
      where: { patientId },
      relations: ['dentist'],
      order: { scheduledAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Appointment> {
    const apt = await this.repo.findOne({
      where: { id },
      relations: ['patient', 'dentist'],
    });
    if (!apt) throw new NotFoundException(`Turno ${id} no encontrado`);
    return apt;
  }

  async create(dto: CreateAppointmentDto): Promise<Appointment> {
    const scheduledAt = new Date(dto.scheduledAt);
    this.assertNotInPast(scheduledAt);
    await this.checkConflict(
      dto.dentistId,
      scheduledAt,
      dto.durationMinutes ?? 30,
    );

    const apt = this.repo.create(dto);
    const saved = await this.repo.save(apt);

    // Load full appointment with relations for notification
    const full = await this.findOne(saved.id);

    // Send notification asynchronously — don't block the response
    this.sendCreationNotification(full).catch((err) =>
      console.error('Error enviando notificación de turno:', err),
    );

    return full;
  }

  private async sendCreationNotification(apt: Appointment): Promise<void> {
    const patient = apt.patient;
    if (!patient) return;

    await this.notificationsService.notifyAppointmentCreated({
      patientName: `${patient.firstName} ${patient.lastName}`,
      patientEmail: patient.email,
      dentistName: apt.dentist
        ? `${apt.dentist.lastName}`
        : 'el profesional',
      scheduledAt: new Date(apt.scheduledAt),
      durationMinutes: apt.durationMinutes,
      treatmentType: apt.treatmentType,
      patientId: patient.id,
      appointmentId: apt.id,
      acceptsEmail: patient.acceptsEmail ?? true,
    });

    this.whatsappService.sendAppointmentCreated(patient, apt).catch((err: unknown) =>
      console.error('Error enviando WhatsApp de turno:', err),
    );
  }

  async update(id: string, dto: UpdateAppointmentDto): Promise<Appointment> {
    const apt = await this.findOne(id);
    if (dto.scheduledAt) {
      const scheduledAt = new Date(dto.scheduledAt);
      this.assertNotInPast(scheduledAt);
      await this.checkConflict(
        dto.dentistId ?? apt.dentistId,
        scheduledAt,
        dto.durationMinutes ?? apt.durationMinutes,
      );
    }
    Object.assign(apt, dto);
    return this.repo.save(apt);
  }

  async updateStatus(
    id: string,
    status: AppointmentStatus,
    reason?: string,
  ) {
    const apt = await this.findOne(id);
    apt.status = status;
    if (reason) apt.cancellationReason = reason;
    return this.repo.save(apt);
  }

  async remove(id: string): Promise<void> {
    const apt = await this.findOne(id);
    await this.repo.remove(apt);
  }

  async getAgendaForDay(date: string, dentistId?: string) {
    const from = new Date(`${date}T00:00:00`);
    const to   = new Date(`${date}T23:59:59`);
    return this.findByDateRange(from, to, dentistId);
  }

  async getStats() {
    const today        = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth   = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const [total, completed, absent, pending] = await Promise.all([
      this.repo.count({ where: { scheduledAt: Between(startOfMonth, endOfMonth) } }),
      this.repo.count({ where: { status: AppointmentStatus.COMPLETED, scheduledAt: Between(startOfMonth, endOfMonth) } }),
      this.repo.count({ where: { status: AppointmentStatus.ABSENT,    scheduledAt: Between(startOfMonth, endOfMonth) } }),
      this.repo.count({ where: { status: AppointmentStatus.PENDING } }),
    ]);

    return {
      total, completed, absent, pending,
      absenceRate: total > 0 ? Math.round((absent / total) * 100) : 0,
    };
  }

  async sendCancellationAndUpdate(id: string, reason?: string): Promise<Appointment> {
    const apt = await this.findOne(id);
    apt.status = AppointmentStatus.CANCELLED;
    if (reason) apt.cancellationReason = reason;
    const saved = await this.repo.save(apt);

    // Notify patient asynchronously
    if (apt.patient) {
      const baseUrl = 'http://localhost:3000';
      this.notificationsService.sendCancellationNotification({
        patientName: `${apt.patient.firstName} ${apt.patient.lastName}`,
        patientEmail: apt.patient.email,
        dentistName: apt.dentist ? apt.dentist.lastName : 'el profesional',
        scheduledAt: new Date(apt.scheduledAt),
        durationMinutes: apt.durationMinutes,
        treatmentType: apt.treatmentType,
        patientId: apt.patient.id,
        appointmentId: apt.id,
        acceptsEmail: apt.patient.acceptsEmail ?? true,
        reason,
      }).catch((err: unknown) =>
        console.error('Error notificación cancelación:', err),
      );

      this.whatsappService.sendAppointmentCancelled(apt.patient, saved).catch((err: unknown) =>
        console.error('Error WhatsApp cancelación:', err),
      );
    }
    return saved;
  }

  async sendReminderFor(id: string) {
    const apt = await this.findOne(id);
    if (!apt.patient) {
      return { ok: false, message: 'Paciente no encontrado' };
    }
    const token = randomBytes(24).toString('hex');
    apt.confirmationToken = token;
    await this.repo.save(apt);

    const baseUrl = this.config.get('APP_URL', 'http://localhost:3000');
    const emailResult = await this.notificationsService.sendReminderWithConfirmation({
      patientName: `${apt.patient.firstName} ${apt.patient.lastName}`,
      patientEmail: apt.patient.email,
      dentistName: apt.dentist ? apt.dentist.lastName : 'el profesional',
      scheduledAt: new Date(apt.scheduledAt),
      durationMinutes: apt.durationMinutes,
      treatmentType: apt.treatmentType,
      patientId: apt.patient.id,
      appointmentId: apt.id,
      acceptsEmail: apt.patient.acceptsEmail ?? true,
      confirmationToken: token,
      baseUrl,
    });

    const waResult = await this.whatsappService.sendAppointmentReminder(apt.patient, apt);

    if (!emailResult && !waResult.ok) {
      return {
        ok: false,
        message: 'No se pudo enviar recordatorio por email ni WhatsApp',
      };
    }

    apt.reminderSent = true;
    await this.repo.save(apt);

    if (waResult.ok) {
      return { ok: true, message: waResult.message, channel: 'whatsapp' };
    }
    return emailResult ?? { ok: true, message: 'Recordatorio enviado por email' };
  }

  async confirmByToken(token: string): Promise<{ ok: boolean; message: string }> {
    const apt = await this.repo.findOne({
      where: { confirmationToken: token },
      relations: ['patient'],
    });
    if (!apt) return { ok: false, message: 'Token inválido o expirado' };
    if (apt.status === AppointmentStatus.CANCELLED)
      return { ok: false, message: 'Este turno fue cancelado' };

    apt.status = AppointmentStatus.CONFIRMED_BY_PATIENT;
    apt.confirmationToken = undefined;
    await this.repo.save(apt);
    return {
      ok: true,
      message: 'Su turno quedó confirmado. Gracias por avisarnos.',
    };
  }

  private assertNotInPast(scheduledAt: Date): void {
    if (scheduledAt.getTime() < Date.now()) {
      throw new BadRequestException(
        'No se puede agendar un turno en una fecha u horario que ya pasó',
      );
    }
  }

  private async checkConflict(
    dentistId: string,
    scheduledAt: Date,
    durationMinutes: number,
  ) {
    const end = new Date(scheduledAt.getTime() + durationMinutes * 60000);
    const conflict = await this.repo
      .createQueryBuilder('a')
      .where('a.dentistId = :dentistId', { dentistId })
      .andWhere('a.status NOT IN (:...cancelled)', {
        cancelled: [AppointmentStatus.CANCELLED],
      })
      .andWhere(
        "a.scheduledAt < :end AND a.scheduledAt + (a.durationMinutes * interval '1 minute') > :start",
        { start: scheduledAt, end },
      )
      .getOne();

    if (conflict) {
      throw new BadRequestException(
        `Conflicto de horario: ya hay un turno a las ${new Date(conflict.scheduledAt).toLocaleTimeString('es-AR')}`,
      );
    }
  }
}
