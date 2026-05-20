import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull, Not } from 'typeorm';
import { Invoice, InvoiceStatus, PaymentMethod } from './invoice.entity';
import { InvoiceItem } from './invoice-item.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(Invoice) private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(InvoiceItem) private readonly itemRepo: Repository<InvoiceItem>,
  ) {}

  private async generateNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.invoiceRepo.count();
    return `DF-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  async findAll(filters: {
    status?: InvoiceStatus;
    patientId?: string;
    socialWorkId?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, patientId, socialWorkId, from, to, page = 1, limit = 20 } = filters;
    const qb = this.invoiceRepo
      .createQueryBuilder('inv')
      .leftJoinAndSelect('inv.patient', 'patient')
      .leftJoinAndSelect('inv.dentist', 'dentist')
      .leftJoinAndSelect('inv.items', 'items')
      .orderBy('inv.createdAt', 'DESC');

    if (status) qb.andWhere('inv.status = :status', { status });
    if (patientId) qb.andWhere('inv.patientId = :patientId', { patientId });
    if (socialWorkId) qb.andWhere('inv.socialWorkId = :socialWorkId', { socialWorkId });
    if (from) qb.andWhere('inv.createdAt >= :from', { from });
    if (to) qb.andWhere('inv.createdAt <= :to', { to });

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<Invoice> {
    const inv = await this.invoiceRepo.findOne({
      where: { id },
      relations: ['patient', 'dentist', 'items'],
    });
    if (!inv) throw new NotFoundException(`Factura ${id} no encontrada`);
    return inv;
  }

  async findByPatient(patientId: string): Promise<Invoice[]> {
    return this.invoiceRepo.find({
      where: { patientId },
      relations: ['items', 'dentist'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(dto: CreateInvoiceDto, dentistId: string): Promise<Invoice> {
    const number = await this.generateNumber();
    const subtotal = dto.items.reduce((sum, i) => {
      const qty = Number(i.quantity ?? 1);
      const price = Number(i.unitPrice ?? 0);
      return sum + price * qty;
    }, 0);
    const discountAmount = subtotal * ((dto.discountPercent ?? 0) / 100);
    const total = subtotal - discountAmount;

    // Exclude items array from invoice entity — saved separately
    const { items: _items, ...invoiceData } = dto;

    const invoice = this.invoiceRepo.create({
      ...invoiceData,
      number,
      dentistId,
      subtotal,
      discountAmount,
      total,
      paidAmount: dto.paymentMethod === PaymentMethod.SOCIAL_WORK ? 0 : total,
      pendingAmount: dto.paymentMethod === PaymentMethod.SOCIAL_WORK ? total : 0,
      issueDate: new Date().toISOString().split('T')[0],
      status: dto.paymentMethod === PaymentMethod.SOCIAL_WORK
        ? InvoiceStatus.ISSUED
        : InvoiceStatus.PAID,
    });

    const saved = await this.invoiceRepo.save(invoice);

    const items = dto.items.map((item) => {
      const qty = Number(item.quantity ?? 1);
      const price = Number(item.unitPrice ?? 0);
      return this.itemRepo.create({
        description: item.description,
        nomenclatorCode: item.nomenclatorCode,
        toothNumber: item.toothNumber,
        surface: item.surface,
        quantity: qty,
        unitPrice: price,
        invoiceId: saved.id,
        total: price * qty,
      });
    });
    await this.itemRepo.save(items);

    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateInvoiceDto): Promise<Invoice> {
    const inv = await this.findOne(id);
    Object.assign(inv, dto);
    return this.invoiceRepo.save(inv);
  }

  async updateStatus(id: string, status: InvoiceStatus, reason?: string): Promise<Invoice> {
    const inv = await this.findOne(id);
    if (inv.status === InvoiceStatus.CANCELLED)
      throw new BadRequestException('No se puede modificar una factura cancelada');
    inv.status = status;
    if (status === InvoiceStatus.SUBMITTED) inv.submittedDate = new Date().toISOString().split('T')[0];
    if (status === InvoiceStatus.PAID) {
      inv.paidDate = new Date().toISOString().split('T')[0];
      inv.paidAmount = Number(inv.total);
      inv.pendingAmount = 0;
    }
    if (status === InvoiceStatus.REJECTED) inv.rejectionReason = reason;
    return this.invoiceRepo.save(inv);
  }

  async registerPartialPayment(id: string, amount: number): Promise<Invoice> {
    const inv = await this.findOne(id);
    inv.paidAmount = Math.min(Number(inv.paidAmount) + amount, Number(inv.total));
    inv.pendingAmount = Number(inv.total) - Number(inv.paidAmount);
    if (inv.pendingAmount <= 0) {
      inv.status = InvoiceStatus.PAID;
      inv.paidDate = new Date().toISOString().split('T')[0];
    }
    return this.invoiceRepo.save(inv);
  }

  async getFinancialSummary(from: string, to: string) {
    const invoices = await this.invoiceRepo.find({
      where: { createdAt: Between(new Date(from), new Date(to)) },
      relations: ['items'],
    });

    const total = invoices.reduce((s, i) => s + Number(i.total), 0);
    const paid = invoices.filter((i) => i.status === InvoiceStatus.PAID)
      .reduce((s, i) => s + Number(i.paidAmount), 0);
    const pending = invoices.reduce((s, i) => s + Number(i.pendingAmount), 0);
    const byStatus: Record<string, number> = {};
    const byPaymentMethod: Record<string, number> = {};

    for (const inv of invoices) {
      byStatus[inv.status] = (byStatus[inv.status] ?? 0) + Number(inv.total);
      byPaymentMethod[inv.paymentMethod] = (byPaymentMethod[inv.paymentMethod] ?? 0) + Number(inv.paidAmount);
    }

    const socialWorkPending = invoices
      .filter((i) => i.socialWorkId && [InvoiceStatus.ISSUED, InvoiceStatus.SUBMITTED].includes(i.status))
      .reduce((s, i) => s + Number(i.pendingAmount), 0);

    return {
      total, paid, pending, socialWorkPending,
      count: invoices.length,
      paidCount: invoices.filter((i) => i.status === InvoiceStatus.PAID).length,
      byStatus, byPaymentMethod,
    };
  }

  async getSocialWorkLiquidation(socialWorkId: string, from: string, to: string) {
    return this.invoiceRepo.find({
      where: {
        socialWorkId,
        createdAt: Between(new Date(from), new Date(to)),
      },
      relations: ['patient', 'items'],
      order: { createdAt: 'ASC' },
    });
  }
}
