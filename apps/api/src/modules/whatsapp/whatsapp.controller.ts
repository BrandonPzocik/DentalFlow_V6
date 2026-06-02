import {
  Controller, Get, Post, Patch, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WhatsappService } from './whatsapp.service';
import { InternalNotificationService } from './internal-notification.service';
import {
  WhatsappDirection,
  WhatsappMessageStatus,
} from './whatsapp-message.entity';
import { ConfigService } from '@nestjs/config';

@ApiTags('WhatsApp')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('whatsapp')
export class WhatsappController {
  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly internalNotifications: InternalNotificationService,
    private readonly config: ConfigService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Estado de Twilio y métricas de mensajes' })
  async status() {
    const stats = await this.whatsappService.getStats();
    const number = this.config.get('TWILIO_WHATSAPP_NUMBER', '');
    return {
      ...stats,
      fromNumber: number,
    };
  }

  @Get('messages')
  @ApiOperation({ summary: 'Historial de mensajes WhatsApp (paginado)' })
  @ApiQuery({ name: 'direction', required: false, enum: WhatsappDirection })
  @ApiQuery({ name: 'status', required: false, enum: WhatsappMessageStatus })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  listMessages(
    @Query('direction') direction?: WhatsappDirection,
    @Query('status') status?: WhatsappMessageStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.whatsappService.listMessages({ direction, status, page, limit });
  }

  @Get('internal')
  @ApiOperation({ summary: 'Notificaciones internas del consultorio' })
  listInternal(
    @Query('limit') limit?: number,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.internalNotifications.listRecent(
      limit ? Number(limit) : 30,
      unreadOnly === 'true',
    );
  }

  @Get('internal/unread-count')
  unreadCount() {
    return this.internalNotifications.countUnread();
  }

  @Patch('internal/:id/read')
  markRead(@Param('id') id: string) {
    return this.internalNotifications.markRead(id);
  }

  @Post('internal/read-all')
  markAllRead() {
    return this.internalNotifications.markAllRead();
  }
}
