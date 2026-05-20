import {
  Controller, Get, Post, Put, Patch, Param,
  Body, Query, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceStatus } from './invoice.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly service: BillingService) {}

  @Get()
  @ApiOperation({ summary: 'Listar facturas con filtros' })
  findAll(
    @Query('status') status?: InvoiceStatus,
    @Query('patientId') patientId?: string,
    @Query('socialWorkId') socialWorkId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.findAll({ status, patientId, socialWorkId, from, to, page, limit });
  }

  @Get('summary')
  @ApiOperation({ summary: 'Resumen financiero por período' })
  getSummary(@Query('from') from: string, @Query('to') to: string) {
    return this.service.getFinancialSummary(from, to);
  }

  @Get('liquidation/:socialWorkId')
  @ApiOperation({ summary: 'Liquidación de una obra social por período' })
  getLiquidation(
    @Param('socialWorkId') socialWorkId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.service.getSocialWorkLiquidation(socialWorkId, from, to);
  }

  @Get('patient/:patientId')
  getByPatient(@Param('patientId') patientId: string) {
    return this.service.findByPatient(patientId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @ApiOperation({ summary: 'Crear nueva factura/presupuesto' })
  create(@Body() dto: CreateInvoiceDto, @Request() req: any) {
    return this.service.create(dto, req.user.sub);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: InvoiceStatus,
    @Body('reason') reason?: string,
  ) {
    return this.service.updateStatus(id, status, reason);
  }

  @Patch(':id/payment')
  @ApiOperation({ summary: 'Registrar pago parcial o total' })
  registerPayment(@Param('id') id: string, @Body('amount') amount: number) {
    return this.service.registerPartialPayment(id, amount);
  }
}
