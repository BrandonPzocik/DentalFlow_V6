import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Patient } from '../patients/patient.entity';
import { User } from '../users/user.entity';

export enum PrescriptionType {
  RECIPE    = 'recipe',    // Receta médica
  BUDGET    = 'budget',    // Presupuesto
  CERT      = 'cert',      // Certificado de atención
}

export interface RecipeItem {
  drug: string;
  dose: string;
  frequency: string;
  duration: string;
  notes?: string;
}

export interface BudgetItem {
  description: string;
  toothNumber?: number;
  quantity: number;
  unitPrice: number;
  total: number;
}

@Entity('prescriptions')
export class Prescription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: PrescriptionType })
  type: PrescriptionType;

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

  // Recipe fields
  @Column({ type: 'jsonb', nullable: true })
  items: RecipeItem[] | BudgetItem[];

  @Column({ nullable: true })
  diagnosis?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  // Budget fields
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  subtotal?: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  discountPercent?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  total?: number;

  @Column({ nullable: true })
  validUntil?: string;

  @Column({ default: false })
  accepted?: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
