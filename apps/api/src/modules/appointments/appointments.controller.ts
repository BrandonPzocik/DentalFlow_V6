import {
  Controller, Get, Post, Put, Delete, Patch,
  Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Appointments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly service: AppointmentsService) {}

  @Get('day')
  @ApiOperation({ summary: 'Agenda del día para el calendario' })
  @ApiQuery({ name: 'date', example: '2025-01-15' })
  @ApiQuery({ name: 'dentistId', required: false })
  getDay(@Query('date') date: string, @Query('dentistId') dentistId?: string) {
    return this.service.getAgendaForDay(date, dentistId);
  }

  @Get('range')
  @ApiOperation({ summary: 'Turnos en un rango de fechas' })
  @ApiQuery({ name: 'from' })
  @ApiQuery({ name: 'to' })
  @ApiQuery({ name: 'dentistId', required: false })
  getRange(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('dentistId') dentistId?: string,
  ) {
    return this.service.findByDateRange(new Date(from), new Date(to), dentistId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas de turnos del mes actual' })
  getStats() {
    return this.service.getStats();
  }

  @Get('patient/:patientId')
  @ApiOperation({ summary: 'Historial de turnos de un paciente' })
  getByPatient(@Param('patientId') patientId: string) {
    return this.service.findByPatient(patientId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un turno' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear nuevo turno' })
  create(@Body() dto: CreateAppointmentDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar turno' })
  update(@Param('id') id: string, @Body() dto: UpdateAppointmentDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cambiar estado del turno' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.service.updateStatus(id, dto.status, dto.reason);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar turno' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancelar turno y notificar al paciente' })
  cancel(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.service.sendCancellationAndUpdate(id, reason);
  }

  @Post(':id/reminder')
  @ApiOperation({ summary: 'Enviar recordatorio 48h con link de confirmación' })
  sendReminder(@Param('id') id: string) {
    return this.service.sendReminderFor(id);
  }

  // Public endpoint — no JWT required — called from email/WA link
  @Get('confirm/:token')
  @ApiOperation({ summary: 'Confirmar asistencia al turno (link público)' })
  confirmByToken(@Param('token') token: string) {
    return this.service.confirmByToken(token);
  }
}
