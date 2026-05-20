import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany,
} from 'typeorm';
import { Appointment } from '../appointments/appointment.entity';
import { OdontogramRecord } from '../odontogram/odontogram.entity';

export enum BloodType {
  A_POS = 'A+', A_NEG = 'A-',
  B_POS = 'B+', B_NEG = 'B-',
  AB_POS = 'AB+', AB_NEG = 'AB-',
  O_POS = 'O+', O_NEG = 'O-',
}

@Entity('patients')
export class Patient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  dni: string;

  @Column({ type: 'date' })
  dateOfBirth: string;

  @Column()
  phone: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  occupation?: string;

  // Obra social
  @Column({ nullable: true })
  socialWork?: string;

  @Column({ nullable: true })
  affiliateNumber?: string;

  @Column({ nullable: true })
  plan?: string;

  // Datos médicos
  @Column({ type: 'enum', enum: BloodType, nullable: true })
  bloodType?: BloodType;

  @Column({ default: false })
  hasAllergies: boolean;

  @Column({ type: 'text', nullable: true })
  allergiesDetail?: string;

  @Column({ type: 'text', nullable: true })
  currentMedication?: string;

  @Column({ type: 'text', nullable: true })
  systemicDiseases?: string;

  @Column({ default: false })
  isPregnant: boolean;

  @Column({ nullable: true })
  expectedDueDate?: string;

  @Column({ type: 'text', nullable: true })
  medicalNotes?: string;

  @Column({ default: false })
  isBruxist: boolean;

  @Column({ default: true })
  isActive: boolean;

  // Notificaciones
  @Column({ default: true })
  acceptsWhatsapp: boolean;

  @Column({ default: true })
  acceptsEmail: boolean;

  @OneToMany(() => Appointment, (a) => a.patient)
  appointments: Appointment[];

  @OneToMany(() => OdontogramRecord, (o) => o.patient)
  odontogramRecords: OdontogramRecord[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  get age(): number {
    const birth = new Date(this.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }
}
