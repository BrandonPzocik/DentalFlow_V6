import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In, Between } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  InstallmentStatus, TreatmentPlanStatus, TreatmentPaymentType,
} from '@dentaflow/shared';
import { TreatmentCatalog } from './treatment-catalog.entity';
import { TreatmentPlan } from './treatment-plan.entity';
import { TreatmentInstallment } from './treatment-installment.entity';
import { PaymentMethod } from '../billing/invoice.entity';
import { Prescription, PrescriptionType } from '../prescriptions/prescription.entity';
import { Patient } from '../patients/patient.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification-log.entity';
import {
  CreateTreatmentPlanDto, CreateFromBudgetDto, PayInstallmentDto,
} from './dto/treatment-plan.dto';

const DEFAULT_CATALOG = [
  { name: 'Brackets metálicos', category: 'Ortodoncia', defaultPrice: 350000, suggestedInstallments: 24, paymentType: TreatmentPaymentType.MONTHLY, description: 'Ortodoncia fija metálica — cuota mensual' },
  { name: 'Brackets estéticos', category: 'Ortodoncia', defaultPrice: 450000, suggestedInstallments: 24, paymentType: TreatmentPaymentType.MONTHLY, description: 'Ortodoncia fija estética — cuota mensual' },
  { name: 'Alineadores invisibles', category: 'Ortodoncia', defaultPrice: 500000, suggestedInstallments: 12, paymentType: TreatmentPaymentType.MONTHLY, description: 'Tratamiento con alineadores transparentes' },
  { name: 'Conducto unirradicular', category: 'Endodoncia', defaultPrice: 45000, suggestedInstallments: 2, paymentType: TreatmentPaymentType.SESSION, description: 'Endodoncia en diente unirradicular' },
  { name: 'Conducto birradicular', category: 'Endodoncia', defaultPrice: 60000, suggestedInstallments: 2, paymentType: TreatmentPaymentType.SESSION, description: 'Endodoncia en diente birradicular' },
  { name: 'Conducto multirradicular', category: 'Endodoncia', defaultPrice: 75000, suggestedInstallments: 3, paymentType: TreatmentPaymentType.SESSION, description: 'Endodoncia en diente multirradicular' },
  { name: 'Implante + corona', category: 'Implantología', defaultPrice: 280000, suggestedInstallments: 6, paymentType: TreatmentPaymentType.MONTHLY, description: 'Implante osteointegrado con corona protésica' },
  { name: 'Corona de porcelana', category: 'Prótesis', defaultPrice: 120000, suggestedInstallments: 2, paymentType: TreatmentPaymentType.SESSION, description: 'Corona cerámica — anticipo + saldo' },
  { name: 'Prótesis removible', category: 'Prótesis', defaultPrice: 180000, suggestedInstallments: 3, paymentType: TreatmentPaymentType.SESSION, description: 'Prótesis parcial o total removible' },
  { name: 'Blanqueamiento dental', category: 'Estética', defaultPrice: 55000, suggestedInstallments: 1, paymentType: TreatmentPaymentType.SINGLE, description: 'Blanqueamiento en consultorio' },
  { name: 'Limpieza dental', category: 'Preventiva', defaultPrice: 18000, suggestedInstallments: 1, paymentType: TreatmentPaymentType.SINGLE, description: 'Profilaxis y detección de placa' },
  { name: 'Obturación simple', category: 'Operatoria', defaultPrice: 22000, suggestedInstallments: 1, paymentType: TreatmentPaymentType.SINGLE, description: 'Restauración de una superficie' },
  { name: 'Obturación compuesta', category: 'Operatoria', defaultPrice: 35000, suggestedInstallments: 1, paymentType: TreatmentPaymentType.SINGLE, description: 'Restauración estética multicapa' },
  { name: 'Extracción simple', category: 'Cirugía', defaultPrice: 20000, suggestedInstallments: 1, paymentType: TreatmentPaymentType.SINGLE, description: 'Extracción de pieza sin complicaciones' },
  { name: 'Extracción de cordal', category: 'Cirugía', defaultPrice: 45000, suggestedInstallments: 1, paymentType: TreatmentPaymentType.SINGLE, description: 'Extracción quirúrgica de tercer molar' },
  { name: 'Raspado y alisado radicular', category: 'Periodoncia', defaultPrice: 40000, suggestedInstallments: 4, paymentType: TreatmentPaymentType.SESSION, description: 'Tratamiento periodontal por cuadrante/sesión' },
  { name: 'Carillas estéticas', category: 'Estética', defaultPrice: 150000, suggestedInstallments: 3, paymentType: TreatmentPaymentType.SESSION, description: 'Carillas de composite o porcelana' },
];

@Injectable()
export class TreatmentPlansService {
  private readonly logger = new Logger(TreatmentPlansService.name);
  private receiptCounter = 0;

  constructor(
    @InjectRepository(TreatmentCatalog)
    private readonly catalogRepo: Repository<TreatmentCatalog>,
    @InjectRepository(TreatmentPlan)
    private readonly planRepo: Repository<TreatmentPlan>,
    @InjectRepository(TreatmentInstallment)
    private readonly installmentRepo: Repository<TreatmentInstallment>,
    @InjectRepository(Prescription)
    private readonly prescriptionRepo: Repository<Prescription>,
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ── Catalog ────────────────────────────────────────────────────────────────

  async getCatalog(): Promise<TreatmentCatalog[]> {
    let items = await this.catalogRepo.find({ where: { active: true }, order: { category: 'ASC', name: 'ASC' } });
    if (!items.length) {
      await this.seedCatalog();
      items = await this.catalogRepo.find({ where: { active: true }, order: { category: 'ASC', name: 'ASC' } });
    }
    return items;
  }

  async seedCatalog(): Promise<{ created: number }> {
    const existing = await this.catalogRepo.count();
    if (existing > 0) return { created: 0 };
    const items = DEFAULT_CATALOG.map((c) => this.catalogRepo.create(c));
    await this.catalogRepo.save(items);
    return { created: items.length };
  }

  // ── Plans ──────────────────────────────────────────────────────────────────

  async findByPatient(patientId: string): Promise<TreatmentPlan[]> {
    return this.planRepo.find({
      where: { patientId },
      relations: ['dentist', 'catalogItem', 'installments'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<TreatmentPlan> {
    const plan = await this.planRepo.findOne({
      where: { id },
      relations: ['patient', 'dentist', 'catalogItem', 'installments'],
    });
    if (!plan) throw new NotFoundException(`Plan de tratamiento ${id} no encontrado`);
    plan.installments?.sort((a, b) => a.number - b.number);
    return plan;
  }

  async createPlan(
    patientId: string,
    dentistId: string,
    dto: CreateTreatmentPlanDto,
  ): Promise<TreatmentPlan> {
    let title = dto.title;
    let category = dto.category;
    let totalPrice = dto.totalPrice;
    let installmentCount = dto.installmentCount ?? 1;
    let downPayment = dto.downPayment ?? 0;

    if (dto.catalogItemId) {
      const cat = await this.catalogRepo.findOne({ where: { id: dto.catalogItemId } });
      if (cat) {
        title = title || cat.name;
        category = category || cat.category;
        if (!dto.totalPrice) totalPrice = Number(cat.defaultPrice);
        if (!dto.installmentCount) installmentCount = cat.suggestedInstallments;
      }
    }

    const plan = this.planRepo.create({
      patientId,
      dentistId,
      catalogItemId: dto.catalogItemId,
      title,
      category,
      totalPrice,
      downPayment,
      paidAmount: 0,
      pendingAmount: totalPrice,
      installmentCount,
      startDate: dto.startDate,
      notes: dto.notes,
      prescriptionId: dto.prescriptionId,
      toothNumber: dto.toothNumber,
      status: TreatmentPlanStatus.ACTIVE,
    });

    const saved = await this.planRepo.save(plan);
    await this.generateInstallments(saved, downPayment, installmentCount, totalPrice, dto.startDate);
    return this.findOne(saved.id);
  }

  private async generateInstallments(
    plan: TreatmentPlan,
    downPayment: number,
    installmentCount: number,
    totalPrice: number,
    startDate: string,
  ): Promise<void> {
    const installments: Partial<TreatmentInstallment>[] = [];
    const start = new Date(startDate + 'T12:00:00');
    let remaining = totalPrice;

    if (downPayment > 0) {
      installments.push({
        planId: plan.id,
        number: 0,
        label: 'Anticipo',
        amount: downPayment,
        dueDate: startDate,
        status: InstallmentStatus.PENDING,
      });
      remaining -= downPayment;
    }

    const perInstallment = installmentCount > 0
      ? Math.round((remaining / installmentCount) * 100) / 100
      : remaining;

    for (let i = 1; i <= installmentCount; i++) {
      const due = new Date(start);
      due.setMonth(due.getMonth() + i);
      const isLast = i === installmentCount;
      const amount = isLast
        ? Math.round((remaining - perInstallment * (installmentCount - 1)) * 100) / 100
        : perInstallment;

      installments.push({
        planId: plan.id,
        number: i,
        label: installmentCount === 1 ? 'Pago único' : `Cuota ${i}/${installmentCount}`,
        amount,
        dueDate: due.toISOString().split('T')[0],
        status: InstallmentStatus.PENDING,
      });
    }

    await this.installmentRepo.save(installments.map((i) => this.installmentRepo.create(i)));
  }

  async createFromBudget(
    patientId: string,
    dentistId: string,
    prescriptionId: string,
    dto: CreateFromBudgetDto,
  ): Promise<TreatmentPlan> {
    const rx = await this.prescriptionRepo.findOne({ where: { id: prescriptionId, patientId } });
    if (!rx) throw new NotFoundException('Presupuesto no encontrado');
    if (rx.type !== PrescriptionType.BUDGET) throw new BadRequestException('Solo se pueden convertir presupuestos');

    const items = (rx.items ?? []) as any[];
    const title = items.length === 1
      ? items[0].description
      : `Plan de ${items.length} prestaciones`;

    return this.createPlan(patientId, dentistId, {
      title,
      category: 'Presupuesto',
      totalPrice: Number(rx.total),
      downPayment: dto.downPayment ?? 0,
      installmentCount: dto.installmentCount,
      startDate: dto.startDate,
      notes: dto.notes ?? rx.notes,
      prescriptionId,
      toothNumber: items[0]?.toothNumber,
    });
  }

  async createFromOdontogram(
    patientId: string,
    dentistId: string,
    data: { title: string; category: string; totalPrice: number; toothNumber?: number; installmentCount?: number; startDate: string; notes?: string },
  ): Promise<TreatmentPlan> {
    return this.createPlan(patientId, dentistId, {
      title: data.title,
      category: data.category,
      totalPrice: data.totalPrice,
      installmentCount: data.installmentCount ?? 1,
      startDate: data.startDate,
      notes: data.notes,
      toothNumber: data.toothNumber,
    });
  }

  async updateStatus(id: string, status: TreatmentPlanStatus): Promise<TreatmentPlan> {
    const plan = await this.findOne(id);
    plan.status = status;
    if (status === TreatmentPlanStatus.COMPLETED && Number(plan.pendingAmount) <= 0) {
      // ok
    } else if (status === TreatmentPlanStatus.COMPLETED && Number(plan.pendingAmount) > 0) {
      throw new BadRequestException('No se puede completar un plan con saldo pendiente');
    }
    await this.planRepo.save(plan);
    return this.findOne(id);
  }

  // ── Payments ───────────────────────────────────────────────────────────────

  async payInstallment(
    planId: string,
    installmentId: string,
    dto: PayInstallmentDto,
    clinicName = 'DentaFlow',
    clinicAddress = '',
  ): Promise<{ plan: TreatmentPlan; installment: TreatmentInstallment; emailResult?: any }> {
    const plan = await this.findOne(planId);
    const inst = plan.installments.find((i) => i.id === installmentId);
    if (!inst) throw new NotFoundException('Cuota no encontrada');
    if (inst.status === InstallmentStatus.PAID) throw new BadRequestException('Esta cuota ya fue pagada');
    if (inst.status === InstallmentStatus.WAIVED) throw new BadRequestException('Esta cuota fue condonada');

    const amount = Math.min(dto.amount, Number(inst.amount));
    inst.status = InstallmentStatus.PAID;
    inst.paidAt = new Date().toISOString().split('T')[0];
    inst.paymentMethod = dto.paymentMethod as PaymentMethod;
    inst.receiptNumber = await this.generateReceiptNumber();
    inst.notes = dto.notes ?? inst.notes;

    await this.installmentRepo.save(inst);

    plan.paidAmount = Number(plan.paidAmount) + amount;
    plan.pendingAmount = Math.max(0, Number(plan.totalPrice) - Number(plan.paidAmount));
    if (Number(plan.pendingAmount) <= 0) {
      plan.status = TreatmentPlanStatus.COMPLETED;
    }
    await this.planRepo.save(plan);

    let emailResult;
    if (dto.sendReceipt !== false) {
      emailResult = await this.sendPaymentReceipt(planId, installmentId, clinicName, clinicAddress);
    }

    return { plan: await this.findOne(planId), installment: inst, emailResult };
  }

  private async generateReceiptNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.installmentRepo.count({ where: { status: InstallmentStatus.PAID } });
    return `RC-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  async sendPaymentReceipt(
    planId: string,
    installmentId: string,
    clinicName = 'DentaFlow',
    clinicAddress = '',
  ) {
    const plan = await this.findOne(planId);
    const inst = plan.installments.find((i) => i.id === installmentId);
    if (!inst || inst.status !== InstallmentStatus.PAID) {
      throw new BadRequestException('Solo se puede enviar recibo de cuotas pagadas');
    }

    const patient = plan.patient ?? await this.patientRepo.findOne({ where: { id: plan.patientId } });
    if (!patient?.email) throw new BadRequestException('El paciente no tiene email');
    if (patient.acceptsEmail === false) throw new BadRequestException('El paciente no acepta emails');

    const paidCount = plan.installments.filter((i) => i.status === InstallmentStatus.PAID).length;
    const totalInstallments = plan.installments.filter((i) => i.number > 0).length;

    const html = this.buildReceiptHtml({
      clinicName,
      clinicAddress,
      patient,
      plan,
      installment: inst,
      paidCount,
      totalInstallments,
    });

    return this.notificationsService.sendDocumentToPatient({
      patientId: plan.patientId,
      subject: `Recibo ${inst.receiptNumber} — ${plan.title} — ${patient.lastName}, ${patient.firstName}`,
      html,
      type: NotificationType.PAYMENT_RECEIPT,
    });
  }

  buildReceiptHtml(data: {
    clinicName: string;
    clinicAddress: string;
    patient: Patient;
    plan: TreatmentPlan;
    installment: TreatmentInstallment;
    paidCount: number;
    totalInstallments: number;
  }): string {
    const fmt = (n: number) =>
      new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

    const methodLabels: Record<string, string> = {
      cash: 'Efectivo', card_debit: 'Débito', card_credit: 'Crédito',
      transfer: 'Transferencia', mercado_pago: 'Mercado Pago', social_work: 'Obra social',
    };

    return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Recibo ${data.installment.receiptNumber}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#334155}</style></head><body>
<div style="max-width:560px;margin:0 auto;padding:16px">
  <div style="border-bottom:3px solid #0d9488;padding-bottom:12px;margin-bottom:16px">
    <div style="font-size:17px;font-weight:800">${data.clinicName}</div>
    ${data.clinicAddress ? `<div style="font-size:11px;color:#64748b">${data.clinicAddress}</div>` : ''}
    <div style="margin-top:8px;font-size:14px;font-weight:700;color:#0f766e">RECIBO DE PAGO — ${data.installment.receiptNumber}</div>
  </div>
  <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:10px;padding:14px;margin-bottom:16px">
    <div style="font-weight:700">${data.patient.lastName}, ${data.patient.firstName}</div>
    <div style="font-size:12px;color:#64748b">DNI ${data.patient.dni}</div>
  </div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
    <tr><td style="padding:8px 0;color:#64748b">Tratamiento</td><td style="padding:8px 0;text-align:right;font-weight:600">${data.plan.title}</td></tr>
    <tr><td style="padding:8px 0;color:#64748b">Concepto</td><td style="padding:8px 0;text-align:right;font-weight:600">${data.installment.label}</td></tr>
    <tr><td style="padding:8px 0;color:#64748b">Método de pago</td><td style="padding:8px 0;text-align:right">${methodLabels[data.installment.paymentMethod ?? ''] ?? data.installment.paymentMethod}</td></tr>
    <tr><td style="padding:8px 0;color:#64748b">Fecha de pago</td><td style="padding:8px 0;text-align:right">${data.installment.paidAt ? new Date(data.installment.paidAt + 'T12:00:00').toLocaleDateString('es-AR') : '—'}</td></tr>
    <tr style="border-top:2px solid #e2e8f0"><td style="padding:12px 0;font-size:15px;font-weight:700">Monto abonado</td><td style="padding:12px 0;text-align:right;font-size:18px;font-weight:800;color:#0f766e">${fmt(Number(data.installment.amount))}</td></tr>
    <tr><td style="padding:8px 0;color:#64748b">Cuotas pagadas</td><td style="padding:8px 0;text-align:right">${data.paidCount} de ${data.totalInstallments + (data.plan.downPayment > 0 ? 1 : 0)}</td></tr>
    <tr><td style="padding:8px 0;color:#64748b">Saldo pendiente</td><td style="padding:8px 0;text-align:right;font-weight:600;color:#d97706">${fmt(Number(data.plan.pendingAmount))}</td></tr>
  </table>
  <div style="font-size:11px;color:#94a3b8;padding-top:12px;border-top:1px solid #e2e8f0">
    Comprobante emitido el ${new Date().toLocaleDateString('es-AR')} · ${data.clinicName}
  </div>
</div></body></html>`;
  }

  // ── Dashboard / alerts ─────────────────────────────────────────────────────

  async getOverdueInstallments(): Promise<(TreatmentInstallment & { plan: TreatmentPlan })[]> {
    const today = new Date().toISOString().split('T')[0];
    const items = await this.installmentRepo.find({
      where: {
        status: In([InstallmentStatus.PENDING, InstallmentStatus.OVERDUE]),
        dueDate: LessThan(today),
      },
      relations: ['plan', 'plan.patient'],
      order: { dueDate: 'ASC' },
    });
    return items as any;
  }

  async getUpcomingInstallments(days = 7): Promise<TreatmentInstallment[]> {
    const today = new Date();
    const end = new Date(today);
    end.setDate(end.getDate() + days);
    return this.installmentRepo.find({
      where: {
        status: InstallmentStatus.PENDING,
        dueDate: Between(today.toISOString().split('T')[0], end.toISOString().split('T')[0]),
      },
      relations: ['plan', 'plan.patient'],
      order: { dueDate: 'ASC' },
    });
  }

  async getPatientPendingInstallments(patientId: string): Promise<TreatmentInstallment[]> {
    const plans = await this.findByPatient(patientId);
    const activePlanIds = plans
      .filter((p) => p.status === TreatmentPlanStatus.ACTIVE)
      .map((p) => p.id);
    if (!activePlanIds.length) return [];
    return this.installmentRepo.find({
      where: {
        planId: In(activePlanIds),
        status: In([InstallmentStatus.PENDING, InstallmentStatus.OVERDUE]),
      },
      relations: ['plan'],
      order: { dueDate: 'ASC' },
    });
  }

  // ── Cron ───────────────────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async markOverdueInstallments() {
    const today = new Date().toISOString().split('T')[0];
    const pending = await this.installmentRepo.find({
      where: { status: InstallmentStatus.PENDING, dueDate: LessThan(today) },
    });
    if (pending.length) {
      for (const inst of pending) {
        inst.status = InstallmentStatus.OVERDUE;
      }
      await this.installmentRepo.save(pending);
      this.logger.log(`Marcadas ${pending.length} cuotas como vencidas`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendInstallmentReminders() {
    const today = new Date();
    const in3days = new Date(today);
    in3days.setDate(in3days.getDate() + 3);

    const upcoming = await this.installmentRepo.find({
      where: {
        status: InstallmentStatus.PENDING,
        reminderSent: false,
        dueDate: Between(today.toISOString().split('T')[0], in3days.toISOString().split('T')[0]),
      },
      relations: ['plan', 'plan.patient'],
    });

    for (const inst of upcoming) {
      const patient = inst.plan?.patient;
      if (!patient?.email || patient.acceptsEmail === false) continue;

      const fmt = (n: number) =>
        new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

      try {
        await this.notificationsService.sendDocumentToPatient({
          patientId: patient.id,
          subject: `Recordatorio de cuota — ${inst.plan.title}`,
          html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;padding:20px">
            <h2 style="color:#0f766e">Recordatorio de cuota</h2>
            <p>Estimado/a ${patient.firstName} ${patient.lastName},</p>
            <p>Le recordamos que tiene una cuota pendiente:</p>
            <ul>
              <li><strong>Tratamiento:</strong> ${inst.plan.title}</li>
              <li><strong>Concepto:</strong> ${inst.label}</li>
              <li><strong>Monto:</strong> ${fmt(Number(inst.amount))}</li>
              <li><strong>Vencimiento:</strong> ${new Date(inst.dueDate + 'T12:00:00').toLocaleDateString('es-AR')}</li>
            </ul>
            <p style="color:#64748b;font-size:12px">Consultorio DentaFlow</p>
          </body></html>`,
          type: NotificationType.CUSTOM,
        });
        inst.reminderSent = true;
        await this.installmentRepo.save(inst);
      } catch (err: any) {
        this.logger.warn(`No se pudo enviar recordatorio cuota ${inst.id}: ${err.message}`);
      }
    }
  }
}
