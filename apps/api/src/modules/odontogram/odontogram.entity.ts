import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Patient } from '../patients/patient.entity';
import { User } from '../users/user.entity';
import { ToothStatus, ToothSurface } from '@dentaflow/shared';

@Entity('odontogram_records')
export class OdontogramRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  patientId: string;

  @ManyToOne(() => Patient, (p) => p.odontogramRecords)
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @Column()
  performedById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'performedById' })
  performedBy: User;

  @Column({ type: 'int' })
  toothNumber: number;

  @Column({ type: 'enum', enum: ToothSurface, nullable: true })
  surface?: ToothSurface;

  @Column({ type: 'enum', enum: ToothStatus })
  status: ToothStatus;

  @Column({ nullable: true })
  material?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  // Inmutable — nunca se borra, solo se agrega
  @CreateDateColumn()
  createdAt: Date;
}
