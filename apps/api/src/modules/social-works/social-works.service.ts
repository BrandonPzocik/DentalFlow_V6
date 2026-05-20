import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SocialWork } from './social-work.entity';
import { NomenclatorItem } from './nomenclator.entity';
import { CreateSocialWorkDto } from './dto/create-social-work.dto';
import { CreateNomenclatorItemDto } from './dto/create-nomenclator-item.dto';

@Injectable()
export class SocialWorksService {
  constructor(
    @InjectRepository(SocialWork) private readonly swRepo: Repository<SocialWork>,
    @InjectRepository(NomenclatorItem) private readonly nomRepo: Repository<NomenclatorItem>,
  ) {}

  async findAll(): Promise<SocialWork[]> {
    return this.swRepo.find({
      where: { isActive: true },
      relations: ['nomenclator'],
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<SocialWork> {
    const sw = await this.swRepo.findOne({ where: { id }, relations: ['nomenclator'] });
    if (!sw) throw new NotFoundException(`Obra social ${id} no encontrada`);
    return sw;
  }

  async create(dto: CreateSocialWorkDto): Promise<SocialWork> {
    const exists = await this.swRepo.findOne({ where: { name: dto.name } });
    if (exists) throw new ConflictException(`Ya existe la obra social "${dto.name}"`);
    return this.swRepo.save(this.swRepo.create(dto));
  }

  async update(id: string, dto: Partial<CreateSocialWorkDto>): Promise<SocialWork> {
    const sw = await this.findOne(id);
    Object.assign(sw, dto);
    return this.swRepo.save(sw);
  }

  async remove(id: string): Promise<void> {
    const sw = await this.findOne(id);
    sw.isActive = false;
    await this.swRepo.save(sw);
  }

  // Nomenclator
  async addNomenclatorItem(socialWorkId: string, dto: CreateNomenclatorItemDto): Promise<NomenclatorItem> {
    await this.findOne(socialWorkId);
    return this.nomRepo.save(this.nomRepo.create({ ...dto, socialWorkId }));
  }

  async updateNomenclatorItem(id: string, dto: Partial<CreateNomenclatorItemDto>): Promise<NomenclatorItem> {
    const item = await this.nomRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`Ítem ${id} no encontrado`);
    Object.assign(item, dto);
    return this.nomRepo.save(item);
  }

  async removeNomenclatorItem(id: string): Promise<void> {
    await this.nomRepo.update(id, { isActive: false });
  }

  async seedDefaultNomenclator(socialWorkId: string): Promise<void> {
    const defaults = [
      { code: '0101', description: 'Consulta odontológica', unitValue: 2500, category: 'Consulta' },
      { code: '0201', description: 'Radiografía periapical', unitValue: 1200, category: 'Diagnóstico' },
      { code: '0202', description: 'Radiografía panorámica', unitValue: 4500, category: 'Diagnóstico' },
      { code: '0301', description: 'Profilaxis y fluorización', unitValue: 3200, category: 'Prevención' },
      { code: '0401', description: 'Obturación simple (resina)', unitValue: 4800, category: 'Operatoria' },
      { code: '0402', description: 'Obturación compuesta (resina)', unitValue: 7200, category: 'Operatoria' },
      { code: '0403', description: 'Obturación amalgama', unitValue: 3800, category: 'Operatoria' },
      { code: '0501', description: 'Tratamiento de conductos uniradicular', unitValue: 18000, category: 'Endodoncia' },
      { code: '0502', description: 'Tratamiento de conductos birradicular', unitValue: 24000, category: 'Endodoncia' },
      { code: '0503', description: 'Tratamiento de conductos multiradicular', unitValue: 30000, category: 'Endodoncia' },
      { code: '0601', description: 'Extracción simple', unitValue: 5500, category: 'Cirugía' },
      { code: '0602', description: 'Extracción compleja', unitValue: 9500, category: 'Cirugía' },
      { code: '0701', description: 'Corona metal-cerámica', unitValue: 45000, category: 'Prótesis' },
      { code: '0702', description: 'Corona zirconio', unitValue: 65000, category: 'Prótesis' },
      { code: '0801', description: 'Implante oseointegrado', unitValue: 120000, category: 'Implantología' },
    ];
    for (const item of defaults) {
      const exists = await this.nomRepo.findOne({ where: { socialWorkId, code: item.code } });
      if (!exists) {
        await this.nomRepo.save(this.nomRepo.create({ ...item, socialWorkId }));
      }
    }
  }
}
