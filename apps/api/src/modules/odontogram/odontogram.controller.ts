import {
  Controller, Get, Post, Param, Body, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OdontogramService } from './odontogram.service';
import { RegisterTreatmentDto } from './dto/register-treatment.dto';
import { BulkRegisterDto } from './dto/bulk-register.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Odontogram')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('patients/:patientId/odontogram')
export class OdontogramController {
  constructor(private readonly service: OdontogramService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener estado actual del odontograma del paciente' })
  getOdontogram(@Param('patientId') patientId: string) {
    return this.service.getOdontogram(patientId);
  }

  @Get('tooth/:toothNumber/history')
  @ApiOperation({ summary: 'Historial completo de un diente específico' })
  getToothHistory(
    @Param('patientId') patientId: string,
    @Param('toothNumber') toothNumber: number,
  ) {
    return this.service.getToothHistory(patientId, toothNumber);
  }

  @Post('treatment')
  @ApiOperation({ summary: 'Registrar un tratamiento en un diente' })
  registerTreatment(
    @Param('patientId') patientId: string,
    @Body() dto: RegisterTreatmentDto,
    @Request() req: any,
  ) {
    return this.service.registerTreatment(patientId, dto, req.user.sub);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Registrar múltiples tratamientos en una sola operación' })
  bulkRegister(
    @Param('patientId') patientId: string,
    @Body() dto: BulkRegisterDto,
    @Request() req: any,
  ) {
    return this.service.bulkRegister(patientId, dto.treatments, req.user.sub);
  }
}
