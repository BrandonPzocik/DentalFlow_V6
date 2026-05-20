import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Prescription, PrescriptionType } from './prescription.entity';

@Injectable()
export class PrescriptionsService {
  constructor(
    @InjectRepository(Prescription)
    private readonly repo: Repository<Prescription>,
  ) {}

  async findByPatient(patientId: string): Promise<Prescription[]> {
    return this.repo.find({
      where: { patientId },
      relations: ['dentist'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Prescription> {
    const p = await this.repo.findOne({
      where: { id },
      relations: ['patient', 'dentist'],
    });
    if (!p) throw new NotFoundException(`Prescripción ${id} no encontrada`);
    return p;
  }

  async create(dto: Partial<Prescription> & { patientId: string; dentistId: string }): Promise<Prescription> {
    const p = this.repo.create(dto);
    return this.repo.save(p);
  }

  async update(id: string, dto: Partial<Prescription>): Promise<Prescription> {
    const p = await this.findOne(id);
    Object.assign(p, dto);
    return this.repo.save(p);
  }

  async remove(id: string): Promise<void> {
    const p = await this.findOne(id);
    await this.repo.remove(p);
  }

  async accept(id: string): Promise<Prescription> {
    const p = await this.findOne(id);
    p.accepted = true;
    return this.repo.save(p);
  }
}
