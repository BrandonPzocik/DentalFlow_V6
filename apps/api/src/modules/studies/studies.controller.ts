import {
  Controller, Get, Post, Delete, Param,
  Body, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { StudiesService } from './studies.service';
import { StudyType } from './study.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Studies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('patients/:patientId/studies')
export class StudiesController {
  constructor(private readonly service: StudiesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar estudios del paciente (sin datos de imagen)' })
  findAll(@Param('patientId') patientId: string) {
    return this.service.findByPatient(patientId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener estudio con datos de imagen (base64)' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Subir nuevo estudio/radiografía' })
  upload(
    @Param('patientId') patientId: string,
    @Body() body: {
      type: StudyType;
      originalName: string;
      mimeType: string;
      fileSize: number;
      fileData: string;
      toothNumber?: number;
      notes?: string;
    },
    @Request() req: any,
  ) {
    return this.service.upload({
      ...body,
      patientId,
      uploadedById: req.user.sub,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar estudio' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
