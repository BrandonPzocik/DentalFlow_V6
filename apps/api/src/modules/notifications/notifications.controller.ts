import {
  Controller, Get, Post, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { NotificationChannel, NotificationType } from './notification-log.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get('logs')
  @ApiOperation({ summary: 'Historial de emails enviados' })
  getLogs(
    @Query('patientId') patientId?: string,
    @Query('channel') channel?: NotificationChannel,
    @Query('limit') limit?: number,
  ) {
    return this.service.getLogs({ patientId, channel, limit });
  }

  @Post('send')
  @ApiOperation({ summary: 'Enviar email manual a un paciente' })
  sendCustom(
    @Body() dto: {
      patientId: string;
      email?: string;
      subject: string;
      emailBody: string;
    },
  ) {
    return this.service.sendCustomNotification(dto);
  }

  @Post('send-document')
  @ApiOperation({ summary: 'Enviar documento HTML por email (receta, presupuesto, factura)' })
  sendDocument(
    @Body() dto: {
      patientId: string;
      subject: string;
      html: string;
      type: NotificationType;
    },
  ) {
    return this.service.sendDocumentToPatient(dto);
  }

  @Post('reminder')
  @ApiOperation({ summary: 'Enviar recordatorio de turno por email' })
  sendReminder(@Body() data: any) {
    return this.service.sendAppointmentReminder(data);
  }
}
