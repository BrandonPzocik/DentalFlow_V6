import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OdontogramRecord } from './odontogram.entity';
import { RegisterTreatmentDto } from './dto/register-treatment.dto';
import { ToothStatus, ToothSurface, Odontogram, ToothRecord, ADULT_TEETH } from '@dentaflow/shared';

@Injectable()
export class OdontogramService {
  constructor(
    @InjectRepository(OdontogramRecord)
    private readonly repo: Repository<OdontogramRecord>,
  ) {}

  async getOdontogram(patientId: string): Promise<Odontogram> {
    const records = await this.repo.find({
      where: { patientId },
      relations: ['performedBy'],
      order: { createdAt: 'ASC' },
    });

    // Build current state from history (last record per tooth+surface wins)
    const odontogram: Odontogram = {};

    for (const toothNum of ADULT_TEETH) {
      odontogram[toothNum] = {
        toothNumber: toothNum,
        surfaces: {},
        generalStatus: ToothStatus.HEALTHY,
        updatedAt: undefined,
      };
    }

    for (const record of records) {
      const tooth = odontogram[record.toothNumber];
      if (!tooth) continue;

      if (record.surface) {
        tooth.surfaces[record.surface] = {
          surface: record.surface,
          status: record.status,
          notes: record.notes ?? undefined,
          date: record.createdAt.toISOString(),
          material: record.material ?? undefined,
          performedBy: record.performedBy?.fullName,
        };
      } else {
        tooth.generalStatus = record.status;
        tooth.notes = record.notes ?? undefined;
        tooth.updatedAt = record.createdAt.toISOString();
      }
    }

    return odontogram;
  }

  async getToothHistory(patientId: string, toothNumber: number) {
    return this.repo.find({
      where: { patientId, toothNumber },
      relations: ['performedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async registerTreatment(
    patientId: string,
    dto: RegisterTreatmentDto,
    performedById: string,
  ): Promise<OdontogramRecord> {
    const record = this.repo.create({
      patientId,
      performedById,
      toothNumber: dto.toothNumber,
      surface: dto.surface,
      status: dto.status,
      material: dto.material,
      notes: dto.notes,
    });
    return this.repo.save(record);
  }

  async bulkRegister(
    patientId: string,
    treatments: RegisterTreatmentDto[],
    performedById: string,
  ): Promise<OdontogramRecord[]> {
    const records = treatments.map((dto) =>
      this.repo.create({
        patientId,
        performedById,
        toothNumber: dto.toothNumber,
        surface: dto.surface,
        status: dto.status,
        material: dto.material,
        notes: dto.notes,
      }),
    );
    return this.repo.save(records);
  }
}
