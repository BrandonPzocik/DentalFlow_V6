import {
  Controller, Post, Body, Req, ForbiddenException, Header, Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { FastifyRequest } from 'fastify';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { validateRequest } = require('twilio') as {
  validateRequest: (
    authToken: string,
    signature: string,
    url: string,
    params: Record<string, string>,
  ) => boolean;
};
import { WhatsappInboundService } from './whatsapp-inbound.service';

@ApiTags('WhatsApp')
@Controller('whatsapp')
export class WhatsappWebhookController {
  private readonly logger = new Logger(WhatsappWebhookController.name);

  constructor(
    private readonly inbound: WhatsappInboundService,
    private readonly config: ConfigService,
  ) {}

  @Post('webhook')
  @ApiOperation({ summary: 'Webhook público de Twilio (mensajes entrantes)' })
  @Header('Content-Type', 'text/xml')
  async webhook(
    @Req() req: FastifyRequest,
    @Body() body: Record<string, string>,
  ): Promise<string> {
    this.validateTwilioSignature(req, body);

    const from = body.From ?? '';
    const text = (body.Body ?? body.ButtonText ?? '').trim();
    const buttonPayload = body.ButtonPayload?.trim();
    const sid = body.MessageSid;

    this.logger.log(
      `WhatsApp entrante de ${from}: ${text}${buttonPayload ? ` [payload=${buttonPayload}]` : ''}`,
    );

    await this.inbound.handleInbound(from, text, sid, buttonPayload);

    return '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
  }

  private validateTwilioSignature(req: FastifyRequest, body: Record<string, string>) {
    if (this.config.get('TWILIO_WEBHOOK_SKIP_VALIDATION') === 'true') {
      this.logger.warn('Validación de firma Twilio desactivada (solo desarrollo)');
      return;
    }

    const authToken = this.config.get('TWILIO_AUTH_TOKEN');
    if (!authToken) return;

    const signature = req.headers['x-twilio-signature'] as string | undefined;
    if (!signature) {
      throw new ForbiddenException('Firma Twilio ausente');
    }

    const proto = (req.headers['x-forwarded-proto'] as string) ?? 'https';
    const host = (req.headers['x-forwarded-host'] as string) ?? req.headers.host ?? 'localhost';
    const url = `${proto}://${host}${req.url}`;

    const valid = validateRequest(authToken, signature, url, body);
    if (!valid) {
      this.logger.warn(`Firma Twilio inválida para ${url}`);
      throw new ForbiddenException('Firma Twilio inválida');
    }
  }
}
