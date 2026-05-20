import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Patients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar pacientes con filtros y paginación' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'socialWork', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('search') search?: string,
    @Query('socialWork') socialWork?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.patientsService.findAll({ search, socialWork, page, limit });
  }

  @Get('count')
  @ApiOperation({ summary: 'Total de pacientes activos' })
  async count() {
    const result = await this.patientsService.findAll({ limit: 1 });
    return { total: result.total };
  }

  @Get('inactive')
  @ApiOperation({ summary: 'Pacientes sin consultas en los últimos N meses' })
  @ApiQuery({ name: 'months', required: false, type: Number })
  getInactive(@Query('months') months?: number) {
    return this.patientsService.getInactive(months);
  }

  @Get('search')
  @ApiOperation({ summary: 'Búsqueda rápida por nombre para autocomplete' })
  @ApiQuery({ name: 'q', required: true })
  search(@Query('q') q: string) {
    return this.patientsService.searchByName(q);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener ficha completa del paciente' })
  findOne(@Param('id') id: string) {
    return this.patientsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear nuevo paciente' })
  create(@Body() dto: CreatePatientDto) {
    return this.patientsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar datos del paciente' })
  update(@Param('id') id: string, @Body() dto: UpdatePatientDto) {
    return this.patientsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar paciente (soft delete)' })
  remove(@Param('id') id: string) {
    return this.patientsService.remove(id);
  }
}
