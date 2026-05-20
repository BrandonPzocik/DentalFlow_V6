import {
  Controller, Get, Post, Put, Delete, Patch,
  Param, Body, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrescriptionsService } from './prescriptions.service';
import { PrescriptionType } from './prescription.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Prescriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('patients/:patientId/prescriptions')
export class PrescriptionsController {
  constructor(private readonly service: PrescriptionsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar recetas y presupuestos del paciente' })
  findAll(@Param('patientId') patientId: string) {
    return this.service.findByPatient(patientId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear receta, presupuesto o certificado' })
  create(
    @Param('patientId') patientId: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    return this.service.create({ ...dto, patientId, dentistId: req.user.sub });
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @Patch(':id/accept')
  @ApiOperation({ summary: 'Marcar presupuesto como aceptado' })
  accept(@Param('id') id: string) {
    return this.service.accept(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
