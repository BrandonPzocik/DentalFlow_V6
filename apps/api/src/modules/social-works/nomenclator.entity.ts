import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { SocialWork } from './social-work.entity';

@Entity('nomenclator_items')
export class NomenclatorItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  socialWorkId: string;

  @ManyToOne(() => SocialWork, (sw) => sw.nomenclator)
  @JoinColumn({ name: 'socialWorkId' })
  socialWork: SocialWork;

  @Column()
  code: string;

  @Column()
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitValue: number;

  @Column({ nullable: true })
  category?: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
