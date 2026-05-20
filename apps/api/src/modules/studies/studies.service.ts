import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Study, StudyType } from './study.entity';

interface UploadStudyDto {
  patientId: string;
  uploadedById: string;
  type: StudyType;
  originalName: string;
  mimeType: string;
  fileSize: number;
  fileData: string;  // base64
  toothNumber?: number;
  notes?: string;
}

@Injectable()
export class StudiesService {
  constructor(
    @InjectRepository(Study)
    private readonly repo: Repository<Study>,
  ) {}

  async findByPatient(patientId: string): Promise<Omit<Study, 'fileData'>[]> {
    const studies = await this.repo.find({
      where: { patientId },
      relations: ['uploadedBy'],
      order: { createdAt: 'DESC' },
    });
    // Return without fileData for list (too heavy)
    return studies.map(({ fileData, ...s }) => s as any);
  }

  async findOne(id: string): Promise<Study> {
    const s = await this.repo.findOne({ where: { id }, relations: ['uploadedBy'] });
    if (!s) throw new NotFoundException(`Estudio ${id} no encontrado`);
    return s;
  }

  async upload(dto: UploadStudyDto): Promise<Study> {
    const study = this.repo.create({
      ...dto,
      fileName: `${Date.now()}_${dto.originalName}`,
    });
    return this.repo.save(study);
  }

  async remove(id: string): Promise<void> {
    const s = await this.findOne(id);
    await this.repo.remove(s);
  }
}
