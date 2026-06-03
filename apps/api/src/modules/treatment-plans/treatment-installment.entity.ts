import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { InstallmentStatus } from '@dentaflow/shared';
import { PaymentMethod } from '../billing/invoice.entity';
import { TreatmentPlan } from './treatment-plan.entity';

@Entity('treatment_installments')
export class TreatmentInstallment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  planId: string;

  @ManyToOne(() => TreatmentPlan, (p) => p.installments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'planId' })
  plan: TreatmentPlan;

  @Column({ type: 'int' })
  number: number;

  @Column()
  label: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'date' })
  dueDate: string;

  @Column({ type: 'enum', enum: InstallmentStatus, default: InstallmentStatus.PENDING })
  status: InstallmentStatus;

  @Column({ type: 'date', nullable: true })
  paidAt?: string;

  @Column({ type: 'enum', enum: PaymentMethod, nullable: true })
  paymentMethod?: PaymentMethod;

  @Column({ nullable: true })
  receiptNumber?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ default: false })
  reminderSent: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
