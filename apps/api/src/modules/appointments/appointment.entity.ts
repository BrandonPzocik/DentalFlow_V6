import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Patient } from '../patients/patient.entity';
import { User } from '../users/user.entity';
import { AppointmentStatus } from '@dentaflow/shared';

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  patientId: string;

  @ManyToOne(() => Patient, (p) => p.appointments)
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @Column()
  dentistId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'dentistId' })
  dentist: User;

  @Column({ type: 'timestamptz' })
  scheduledAt: Date;

  @Column({ type: 'int', default: 30 })
  durationMinutes: number;

  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    default: AppointmentStatus.PENDING,
  })
  status: AppointmentStatus;

  @Column({ nullable: true })
  treatmentType?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'text', nullable: true })
  cancellationReason?: string;

  @Column({ default: false })
  reminderSent: boolean;

  @Column({ default: false })
  reminder48hSent: boolean;

  @Column({ default: false })
  reminder24hSent: boolean;

  @Column({ default: false })
  reminder2hSent: boolean;

  /** sent | confirmed | cancelled | reschedule_requested */
  @Column({ nullable: true })
  whatsappStatus?: string;

  // Token used in the 48h reminder confirmation link
  @Column({ nullable: true, unique: false })
  confirmationToken?: string;

  @Column({ nullable: true })
  chair?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
