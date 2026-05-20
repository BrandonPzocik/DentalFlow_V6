import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './setting.entity';

const DEFAULTS: Omit<Setting, 'id' | 'updatedAt'>[] = [
  { key: 'clinic_name',         value: 'Mi Consultorio Odontológico', label: 'Nombre del consultorio', group: 'clinic' },
  { key: 'clinic_address',      value: '',   label: 'Dirección',         group: 'clinic' },
  { key: 'clinic_phone',        value: '',   label: 'Teléfono',          group: 'clinic' },
  { key: 'clinic_email',        value: '',   label: 'Email del consultorio', group: 'clinic' },
  { key: 'clinic_logo_url',     value: '',   label: 'URL del logo',      group: 'clinic' },
  { key: 'reminder_48h',        value: 'true', label: 'Recordatorio 48hs',  group: 'notifications' },
  { key: 'reminder_24h',        value: 'true', label: 'Recordatorio 24hs',  group: 'notifications' },
  { key: 'reminder_2h',         value: 'true', label: 'Recordatorio 2hs',   group: 'notifications' },
  { key: 'reminder_channels',   value: 'email', label: 'Canal de recordatorio', group: 'notifications' },
  { key: 'default_appointment_duration', value: '30', label: 'Duración predeterminada (min)', group: 'agenda' },
  { key: 'working_hours_start', value: '08:00', label: 'Horario inicio', group: 'agenda' },
  { key: 'working_hours_end',   value: '19:00', label: 'Horario cierre', group: 'agenda' },
  { key: 'working_days',        value: '1,2,3,4,5', label: 'Días de atención (0=Dom…6=Sáb)', group: 'agenda' },
  { key: 'currency',            value: 'ARS',   label: 'Moneda',         group: 'billing' },
  { key: 'invoice_prefix',      value: 'DF',    label: 'Prefijo facturas', group: 'billing' },
];

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting)
    private readonly repo: Repository<Setting>,
  ) {}

  async getAll(): Promise<Record<string, string>> {
    await this.seedDefaults(); // auto-seed on first call
    const settings = await this.repo.find();
    const map: Record<string, string> = {};
    for (const s of settings) map[s.key] = s.value;
    return map;
  }

  async getAllGrouped(): Promise<{ grouped: Record<string, Setting[]>; flat: Record<string, string> }> {
    await this.seedDefaults(); // auto-seed on first call
    const settings = await this.repo.find({ order: { key: 'ASC' } });
    const grouped: Record<string, Setting[]> = {};
    const flat: Record<string, string> = {};
    for (const s of settings) {
      const g = s.group ?? 'other';
      if (!grouped[g]) grouped[g] = [];
      grouped[g].push(s);
      flat[s.key] = s.value;
    }
    return { grouped, flat };
  }

  async get(key: string): Promise<string | undefined> {
    const s = await this.repo.findOne({ where: { key } });
    return s?.value;
  }

  async set(key: string, value: string): Promise<Setting> {
    let s = await this.repo.findOne({ where: { key } });
    if (s) {
      s.value = value;
    } else {
      const def = DEFAULTS.find((d) => d.key === key);
      s = this.repo.create({ key, value, label: def?.label, group: def?.group });
    }
    return this.repo.save(s);
  }

  async bulkSet(updates: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(updates)) {
      await this.set(key, value);
    }
  }

  async seedDefaults(): Promise<void> {
    for (const def of DEFAULTS) {
      const exists = await this.repo.findOne({ where: { key: def.key } });
      if (!exists) {
        await this.repo.save(this.repo.create(def));
      }
    }
  }
}
