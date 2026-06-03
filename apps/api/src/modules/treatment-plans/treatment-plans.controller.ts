import {
  Controller, Get, Post, Patch, Param, Body, UseGuards, Request, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TreatmentPlansService } from './treatment-plans.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateTreatmentPlanDto, CreateFromBudgetDto, PayInstallmentDto, UpdatePlanStatusDto,
} from './dto/treatment-plan.dto';
import { SettingsService } from '../settings/settings.service';

@ApiTags('Treatment Plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class TreatmentPlansController {
  constructor(
    private readonly service: TreatmentPlansService,
    private readonly settingsService: SettingsService,
  ) {}

  @Get('treatment-plans/catalog')
  @ApiOperation({ summary: 'Catálogo de tratamientos del consultorio' })
  getCatalog() {
    return this.service.getCatalog();
  }

  @Post('treatment-plans/catalog/seed')
  @ApiOperation({ summary: 'Cargar catálogo base de tratamientos' })
  seedCatalog() {
    return this.service.seedCatalog();
  }

  @Get('treatment-plans/overdue')
  @ApiOperation({ summary: 'Cuotas vencidas (dashboard)' })
  getOverdue() {
    return this.service.getOverdueInstallments();
  }

  @Get('treatment-plans/upcoming')
  @ApiOperation({ summary: 'Cuotas próximas a vencer' })
  getUpcoming(@Query('days') days?: number) {
    return this.service.getUpcomingInstallments(days ? Number(days) : 7);
  }

  @Get('patients/:patientId/treatment-plans')
  @ApiOperation({ summary: 'Planes de tratamiento del paciente' })
  findByPatient(@Param('patientId') patientId: string) {
    return this.service.findByPatient(patientId);
  }

  @Get('patients/:patientId/treatment-plans/pending-installments')
  @ApiOperation({ summary: 'Cuotas pendientes del paciente' })
  getPendingInstallments(@Param('patientId') patientId: string) {
    return this.service.getPatientPendingInstallments(patientId);
  }

  @Get('patients/:patientId/treatment-plans/:id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post('patients/:patientId/treatment-plans')
  @ApiOperation({ summary: 'Crear plan de tratamiento con cuotas' })
  create(
    @Param('patientId') patientId: string,
    @Body() dto: CreateTreatmentPlanDto,
    @Request() req: any,
  ) {
    return this.service.createPlan(patientId, req.user.sub, dto);
  }

  @Post('patients/:patientId/treatment-plans/from-budget/:prescriptionId')
  @ApiOperation({ summary: 'Convertir presupuesto aceptado en plan de tratamiento' })
  createFromBudget(
    @Param('patientId') patientId: string,
    @Param('prescriptionId') prescriptionId: string,
    @Body() dto: CreateFromBudgetDto,
    @Request() req: any,
  ) {
    return this.service.createFromBudget(patientId, req.user.sub, prescriptionId, dto);
  }

  @Post('patients/:patientId/treatment-plans/from-odontogram')
  @ApiOperation({ summary: 'Crear plan desde prestación del odontograma' })
  createFromOdontogram(
    @Param('patientId') patientId: string,
    @Body() dto: CreateTreatmentPlanDto,
    @Request() req: any,
  ) {
    return this.service.createPlan(patientId, req.user.sub, dto);
  }

  @Patch('patients/:patientId/treatment-plans/:id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdatePlanStatusDto) {
    return this.service.updateStatus(id, dto.status);
  }

  @Post('patients/:patientId/treatment-plans/:planId/installments/:installmentId/pay')
  @ApiOperation({ summary: 'Registrar pago de cuota y enviar recibo' })
  async payInstallment(
    @Param('planId') planId: string,
    @Param('installmentId') installmentId: string,
    @Body() dto: PayInstallmentDto,
  ) {
    const settings = await this.settingsService.getAll();
    return this.service.payInstallment(
      planId,
      installmentId,
      dto,
      settings['clinic_name'] ?? 'DentaFlow',
      settings['clinic_address'] ?? '',
    );
  }

  @Post('patients/:patientId/treatment-plans/:planId/installments/:installmentId/receipt')
  @ApiOperation({ summary: 'Reenviar recibo de pago por email' })
  async sendReceipt(
    @Param('planId') planId: string,
    @Param('installmentId') installmentId: string,
  ) {
    const settings = await this.settingsService.getAll();
    return this.service.sendPaymentReceipt(
      planId,
      installmentId,
      settings['clinic_name'] ?? 'DentaFlow',
      settings['clinic_address'] ?? '',
    );
  }
}
