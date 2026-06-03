import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne,
  JoinColumn, OneToMany,
} from 'typeorm';
import { TreatmentPlanStatus } from '@dentaflow/shared';
import { Patient } from '../patients/patient.entity';
import { User } from '../users/user.entity';
import { TreatmentCatalog } from './treatment-catalog.entity';
import { TreatmentInstallment } from './treatment-installment.entity';

@Entity('treatment_plans')
export class TreatmentPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  patientId: string;

  @ManyToOne(() => Patient)
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @Column()
  dentistId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'dentistId' })
  dentist: User;

  @Column({ nullable: true })
  catalogItemId?: string;

  @ManyToOne(() => TreatmentCatalog, { nullable: true })
  @JoinColumn({ name: 'catalogItemId' })
  catalogItem?: TreatmentCatalog;

  @Column()
  title: string;

  @Column()
  category: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  totalPrice: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  downPayment: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  paidAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  pendingAmount: number;

  @Column({ type: 'int', default: 1 })
  installmentCount: number;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'enum', enum: TreatmentPlanStatus, default: TreatmentPlanStatus.ACTIVE })
  status: TreatmentPlanStatus;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ nullable: true })
  prescriptionId?: string;

  @Column({ type: 'int', nullable: true })
  toothNumber?: number;

  @OneToMany(() => TreatmentInstallment, (i) => i.plan, { eager: true })
  installments: TreatmentInstallment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
