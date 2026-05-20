import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Patient } from '../patients/patient.entity';
import { User } from '../users/user.entity';

export enum StudyType {
  PERIAPICAL   = 'periapical',
  PANORAMIC    = 'panoramic',
  BITEWING     = 'bitewing',
  CBCT         = 'cbct',
  PHOTO_INTRA  = 'photo_intraoral',
  PHOTO_EXTRA  = 'photo_extraoral',
  OTHER        = 'other',
}

export const STUDY_TYPE_LABELS: Record<StudyType, string> = {
  [StudyType.PERIAPICAL]:  'Rx periapical',
  [StudyType.PANORAMIC]:   'Panorámica',
  [StudyType.BITEWING]:    'Rx aleta mordida',
  [StudyType.CBCT]:        'CBCT / Tomografía',
  [StudyType.PHOTO_INTRA]: 'Foto intraoral',
  [StudyType.PHOTO_EXTRA]: 'Foto extraoral',
  [StudyType.OTHER]:       'Otro estudio',
};

@Entity('studies')
export class Study {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  patientId: string;

  @ManyToOne(() => Patient)
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @Column()
  uploadedById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy: User;

  @Column({ type: 'enum', enum: StudyType, default: StudyType.OTHER })
  type: StudyType;

  @Column()
  fileName: string;

  @Column()
  originalName: string;

  @Column()
  mimeType: string;

  @Column({ type: 'bigint' })
  fileSize: number;

  // Base64 stored directly for simplicity (no S3 needed for local deploy)
  @Column({ type: 'text' })
  fileData: string;

  @Column({ nullable: true })
  toothNumber?: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;
}
