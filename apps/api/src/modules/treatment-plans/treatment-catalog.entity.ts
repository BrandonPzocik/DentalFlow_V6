import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
} from 'typeorm';
import { TreatmentPaymentType } from '@dentaflow/shared';

@Entity('treatment_catalog')
export class TreatmentCatalog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  category: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  defaultPrice: number;

  @Column({ type: 'int', default: 1 })
  suggestedInstallments: number;

  @Column({ type: 'enum', enum: TreatmentPaymentType, default: TreatmentPaymentType.SINGLE })
  paymentType: TreatmentPaymentType;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
