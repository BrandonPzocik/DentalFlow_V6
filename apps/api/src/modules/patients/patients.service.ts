import {
  Injectable, NotFoundException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Patient } from './patient.entity';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

export interface PatientFilters {
  search?: string;
  socialWork?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
  ) {}

  async findAll(filters: PatientFilters = {}) {
    const { search, socialWork, page = 1, limit = 20 } = filters;
    const qb = this.patientRepo
      .createQueryBuilder('p')
      .where('p.isActive = true');

    if (search) {
      qb.andWhere(
        '(p.firstName ILIKE :s OR p.lastName ILIKE :s OR p.dni ILIKE :s OR p.phone ILIKE :s)',
        { s: `%${search}%` },
      );
    }
    if (socialWork) {
      qb.andWhere('p.socialWork ILIKE :sw', { sw: `%${socialWork}%` });
    }

    const [data, total] = await qb
      .orderBy('p.lastName', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<Patient> {
    const p = await this.patientRepo.findOne({
      where: { id },
      relations: ['appointments', 'odontogramRecords'],
    });
    if (!p) throw new NotFoundException(`Paciente ${id} no encontrado`);
    return p;
  }

  async findByDni(dni: string): Promise<Patient | null> {
    return this.patientRepo.findOne({ where: { dni } });
  }

  async create(dto: CreatePatientDto): Promise<Patient> {
    const exists = await this.findByDni(dto.dni);
    if (exists) throw new ConflictException(`Ya existe un paciente con DNI ${dto.dni}`);
    const patient = this.patientRepo.create(dto);
    return this.patientRepo.save(patient);
  }

  async update(id: string, dto: UpdatePatientDto): Promise<Patient> {
    const patient = await this.findOne(id);
    Object.assign(patient, dto);
    return this.patientRepo.save(patient);
  }

  async remove(id: string): Promise<void> {
    const patient = await this.findOne(id);
    patient.isActive = false;
    await this.patientRepo.save(patient);
  }

  async searchByName(query: string): Promise<Patient[]> {
    return this.patientRepo.find({
      where: [
        { firstName: ILike(`%${query}%`), isActive: true },
        { lastName: ILike(`%${query}%`), isActive: true },
      ],
      take: 10,
      order: { lastName: 'ASC' },
    });
  }

  async getInactive(monthsInactive = 6): Promise<Patient[]> {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - monthsInactive);

    return this.patientRepo
      .createQueryBuilder('p')
      .leftJoin('p.appointments', 'a')
      .where('p.isActive = true')
      .groupBy('p.id')
      .having('MAX(a.scheduledAt) < :cutoff OR MAX(a.scheduledAt) IS NULL', {
        cutoff,
      })
      .getMany();
  }
}
