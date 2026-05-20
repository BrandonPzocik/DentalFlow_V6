import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne,
  JoinColumn, OneToMany,
} from 'typeorm';
import { Patient } from '../patients/patient.entity';
import { User } from '../users/user.entity';
import { InvoiceItem } from './invoice-item.entity';

export enum InvoiceStatus {
  DRAFT     = 'draft',
  ISSUED    = 'issued',
  SUBMITTED = 'submitted',  // presentada a obra social
  PAID      = 'paid',
  REJECTED  = 'rejected',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  CASH        = 'cash',
  CARD_DEBIT  = 'card_debit',
  CARD_CREDIT = 'card_credit',
  TRANSFER    = 'transfer',
  MERCADO_PAGO= 'mercado_pago',
  SOCIAL_WORK = 'social_work',
}

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  number: string;

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
  socialWorkId?: string;

  @Column({ nullable: true })
  socialWorkName?: string;

  @Column({ nullable: true })
  affiliateNumber?: string;

  @Column({ nullable: true })
  plan?: string;

  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.DRAFT })
  status: InvoiceStatus;

  @Column({ type: 'enum', enum: PaymentMethod, default: PaymentMethod.CASH })
  paymentMethod: PaymentMethod;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  discountPercent: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  paidAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  pendingAmount: number;

  @Column({ type: 'date', nullable: true })
  issueDate?: string;

  @Column({ type: 'date', nullable: true })
  dueDate?: string;

  @Column({ type: 'date', nullable: true })
  paidDate?: string;

  @Column({ type: 'date', nullable: true })
  submittedDate?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'text', nullable: true })
  rejectionReason?: string;

  @OneToMany(() => InvoiceItem, (item) => item.invoice, { eager: true })
  items: InvoiceItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
