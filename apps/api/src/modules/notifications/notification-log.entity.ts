import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
} from 'typeorm';

export enum NotificationChannel {
  EMAIL = 'email',
  /** @deprecated Solo para registros históricos */
  WHATSAPP = 'whatsapp',
  SMS = 'sms',
}

export enum NotificationType {
  APPOINTMENT_REMINDER = 'appointment_reminder',
  APPOINTMENT_CONFIRM  = 'appointment_confirm',
  APPOINTMENT_CANCEL   = 'appointment_cancel',
  PRESCRIPTION         = 'prescription',
  BUDGET               = 'budget',
  INVOICE              = 'invoice',
  PAYMENT_RECEIPT      = 'payment_receipt',
  BIRTHDAY             = 'birthday',
  INACTIVE_PATIENT     = 'inactive_patient',
  CUSTOM               = 'custom',
}

export enum NotificationStatus {
  PENDING  = 'pending',
  SENT     = 'sent',
  FAILED   = 'failed',
  BOUNCED  = 'bounced',
}

@Entity('notification_logs')
export class NotificationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  patientId?: string;

  @Column({ nullable: true })
  appointmentId?: string;

  @Column({ type: 'enum', enum: NotificationChannel })
  channel: NotificationChannel;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ type: 'enum', enum: NotificationStatus, default: NotificationStatus.PENDING })
  status: NotificationStatus;

  @Column()
  recipient: string;

  @Column()
  subject: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ nullable: true })
  externalId?: string;

  @CreateDateColumn()
  sentAt: Date;
}
