import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from '../settings/settings.service';

const CONTENT_API = 'https://content.twilio.com/v1/Content';

const QUICK_REPLY_ACTIONS = [
  { id: 'confirm', title: 'Confirmar' },
  { id: 'cancel', title: 'Cancelar' },
  { id: 'reschedule', title: 'Reprogramar' },
];

@Injectable()
export class WhatsappContentService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappContentService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly settingsService: SettingsService,
  ) {}

  private hasTwilioCredentials(): boolean {
    const sid = this.config.get('TWILIO_ACCOUNT_SID')?.trim();
    const token = this.config.get('TWILIO_AUTH_TOKEN')?.trim();
    return !!(sid && token && sid.startsWith('AC'));
  }

  async onModuleInit() {
    if (!this.hasTwilioCredentials()) {
      this.logger.warn(
        'Twilio no configurado en el servidor — plantillas WhatsApp omitidas (mensajes de texto)',
      );
      return;
    }

    try {
      await this.ensureTemplates();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`No se pudieron preparar plantillas WhatsApp: ${msg}`);
    }
  }

  private authHeader(): string | null {
    if (!this.hasTwilioCredentials()) return null;
    const sid = this.config.get('TWILIO_ACCOUNT_SID', '').trim();
    const token = this.config.get('TWILIO_AUTH_TOKEN', '').trim();
    return `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`;
  }

  private async contentRequest<T>(
    path: string,
    init?: RequestInit,
  ): Promise<T> {
    const auth = this.authHeader();
    if (!auth) {
      throw new Error('Twilio no configurado');
    }

    const res = await fetch(`${CONTENT_API}${path}`, {
      ...init,
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Content API ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  private async createQuickReplyTemplate(params: {
    friendlyName: string;
    body: string;
    fallbackText: string;
  }): Promise<string> {
    const payload = {
      friendly_name: params.friendlyName,
      language: 'es',
      variables: { '1': 'Paciente', '2': '01/01/2026', '3': '10:00' },
      types: {
        'twilio/quick-reply': {
          body: params.body,
          actions: QUICK_REPLY_ACTIONS,
        },
        'twilio/text': {
          body: params.fallbackText,
        },
      },
    };

    const created = await this.contentRequest<{ sid: string }>('', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.logger.log(`Plantilla WhatsApp creada: ${params.friendlyName} → ${created.sid}`);
    return created.sid;
  }

  async ensureTemplates(): Promise<void> {
    if (!this.hasTwilioCredentials()) return;

    const appointmentSid = await this.settingsService.get('whatsapp_content_appointment_sid');
    const reminderSid = await this.settingsService.get('whatsapp_content_reminder_sid');

    if (!appointmentSid?.trim()) {
      const sid = await this.createQuickReplyTemplate({
        friendlyName: 'dentaflow_turno_registrado',
        body:
          'Hola {{1}}.\n\nSu turno fue registrado.\n\nFecha: {{2}}\nHora: {{3}}\n\nElija una opción:',
        fallbackText:
          'Hola {{1}}. Su turno fue registrado. Fecha: {{2}} Hora: {{3}}. ' +
          'Responda Confirmar, Cancelar o Reprogramar.',
      });
      await this.settingsService.set('whatsapp_content_appointment_sid', sid);
    }

    if (!reminderSid?.trim()) {
      const sid = await this.createQuickReplyTemplate({
        friendlyName: 'dentaflow_recordatorio_turno',
        body:
          'Le recordamos su turno odontológico.\n\nFecha: {{2}}\nHora: {{3}}\n\nElija una opción:',
        fallbackText:
          'Recordatorio: turno el {{2}} a las {{3}}. Responda Confirmar, Cancelar o Reprogramar.',
      });
      await this.settingsService.set('whatsapp_content_reminder_sid', sid);
    }
  }

  private async resolveContentSid(
    settingKey: 'whatsapp_content_appointment_sid' | 'whatsapp_content_reminder_sid',
  ): Promise<string | null> {
    if (!this.hasTwilioCredentials()) return null;

    try {
      let sid = await this.settingsService.get(settingKey);
      if (!sid?.trim()) {
        await this.ensureTemplates();
        sid = await this.settingsService.get(settingKey);
      }
      return sid?.trim() || null;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Plantillas WhatsApp no disponibles (${settingKey}): ${msg}`);
      return null;
    }
  }

  async getAppointmentContentSid(): Promise<string | null> {
    return this.resolveContentSid('whatsapp_content_appointment_sid');
  }

  async getReminderContentSid(): Promise<string | null> {
    return this.resolveContentSid('whatsapp_content_reminder_sid');
  }
}
