import {
  BRAND,
  buildDocumentFooter,
  buildDocumentHeader,
  documentBaseStyles,
  documentPrintButton,
  getLogoAbsoluteUrl,
  openPrintWindow,
} from './documentBrand';

const fmtArs = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n ?? 0);

function docShell(body: string, title: string, maxWidth = '680px'): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>${title}</title>
<style>${documentBaseStyles()}
.doc-wrap{max-width:${maxWidth};margin:0 auto;padding:16px}
</style></head><body>
${documentPrintButton()}
<div class="doc-wrap">${body}</div>
</body></html>`;
}

export function buildRecipeHtml(data: {
  patient: any;
  dentist: any;
  items: any[];
  diagnosis: string;
  notes: string;
  clinicName: string;
  clinicAddress: string;
  date: string;
  logoUrl?: string;
}): string {
  const rows = data.items.map((i: any) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-weight:600;color:#1e293b;font-size:14px">Rp/ ${i.drug}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;color:#475569;font-size:13px">${i.dose}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px">${i.frequency} · ${i.duration}</td>
    </tr>
    ${i.notes ? `<tr><td colspan="3" style="padding:2px 12px 10px;font-size:12px;color:#94a3b8;font-style:italic;border-bottom:1px solid #f1f5f9">${i.notes}</td></tr>` : ''}
  `).join('');

  const body = `
${buildDocumentHeader({
  clinicName: data.clinicName,
  clinicAddress: data.clinicAddress,
  docTitle: 'RECETA MÉDICA',
  docMetaHtml: `<div style="font-size:11px;color:${BRAND.faint};margin-top:4px">Fecha: ${data.date}</div>`,
  logoUrl: data.logoUrl,
})}
<div style="background:#ecfeff;border:1px solid #a5f3fc;border-radius:10px;padding:14px 16px;margin-bottom:16px">
  <div style="font-size:14px;font-weight:700;color:#1e293b">${data.patient.lastName}, ${data.patient.firstName} · DNI ${data.patient.dni}</div>
  ${data.diagnosis ? `<div style="margin-top:8px;font-size:13px"><strong>Diagnóstico:</strong> ${data.diagnosis}</div>` : ''}
</div>
<div style="margin-bottom:16px">
<table class="doc-table" style="border:1px solid ${BRAND.border};border-radius:10px;overflow:hidden">
  <thead><tr>
    <th>Medicamento</th><th>Dosis</th><th>Posología</th>
  </tr></thead><tbody>${rows}</tbody>
</table>
</div>
${data.notes ? `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:9px;padding:12px;margin-bottom:16px">${data.notes}</div>` : ''}
<div style="font-size:11px;color:${BRAND.faint};padding-top:14px;border-top:1px solid ${BRAND.border}">
  Dr. ${data.dentist?.lastName ?? ''}, ${data.dentist?.firstName ?? ''}
  ${data.dentist?.licenseNumber ? ` · Mat. ${data.dentist.licenseNumber}` : ''}
</div>
${buildDocumentFooter({ clinicName: data.clinicName, showSignature: true })}`;

  return docShell(body, `Receta — ${data.patient.lastName}, ${data.patient.firstName}`, '520px');
}

export function buildBudgetHtml(data: {
  patient: any;
  dentist: any;
  items: any[];
  subtotal: number;
  discountPercent: number;
  total: number;
  notes: string;
  clinicName: string;
  clinicAddress: string;
  date: string;
  validUntil: string;
  logoUrl?: string;
}): string {
  const rows = data.items.map((i: any, idx: number) => `
    <tr style="${idx % 2 === 0 ? `background:${BRAND.surface}` : 'background:#fff'}">
      <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9">${i.description}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${i.toothNumber ?? '—'}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${i.quantity}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;text-align:right">${fmtArs(i.unitPrice)}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:${BRAND.primaryDark}">${fmtArs(i.total)}</td>
    </tr>`).join('');
  const discountAmt = data.subtotal * (data.discountPercent / 100);

  const body = `
${buildDocumentHeader({
  clinicName: data.clinicName,
  clinicAddress: data.clinicAddress,
  docTitle: 'PRESUPUESTO',
  docMetaHtml: `<div style="font-size:11px;color:${BRAND.faint};margin-top:4px">Emitido: ${data.date}</div>
    ${data.validUntil ? `<div style="font-size:11px;color:#d97706;margin-top:2px">Válido hasta: ${data.validUntil}</div>` : ''}`,
  logoUrl: data.logoUrl,
})}
<div style="background:#ecfeff;border:1px solid #a5f3fc;border-radius:10px;padding:14px;margin-bottom:16px">
  <div style="font-size:15px;font-weight:700;color:#1e293b">${data.patient.lastName}, ${data.patient.firstName}</div>
  <div style="font-size:12px;color:${BRAND.muted}">DNI ${data.patient.dni}</div>
</div>
<table class="doc-table" style="border:1px solid ${BRAND.border};margin-bottom:16px">
  <thead><tr>
    <th>Prestación</th><th>Pieza</th><th>Cant.</th>
    <th style="text-align:right">P.Unit.</th><th style="text-align:right">Total</th>
  </tr></thead><tbody>${rows}</tbody>
</table>
<div style="text-align:right;margin-bottom:16px">
  ${data.discountPercent > 0 ? `<div style="color:${BRAND.muted}">Subtotal: ${fmtArs(data.subtotal)} · Descuento (${data.discountPercent}%): -${fmtArs(discountAmt)}</div>` : ''}
  <div style="font-size:18px;font-weight:800;color:${BRAND.primaryDark};margin-top:8px">TOTAL: ${fmtArs(data.total)}</div>
</div>
${data.notes ? `<div style="background:#fff7ed;border:1px solid #fed7aa;padding:12px;border-radius:9px;margin-bottom:16px">${data.notes}</div>` : ''}
<div style="font-size:11px;color:${BRAND.faint}">Dr. ${data.dentist?.lastName ?? ''}, ${data.dentist?.firstName ?? ''}</div>
${buildDocumentFooter({ clinicName: data.clinicName, showSignature: true })}`;

  return docShell(body, `Presupuesto — ${data.patient.lastName}, ${data.patient.firstName}`);
}

export function buildInvoiceHtml(data: {
  invoice: any;
  clinicName: string;
  clinicAddress?: string;
  logoUrl?: string;
}): string {
  const inv = data.invoice;
  const rows = (inv.items ?? []).map((item: any, idx: number) => `
    <tr style="${idx % 2 === 0 ? `background:${BRAND.surface}` : ''}">
      <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9">${item.description}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:center">${item.toothNumber ?? '—'}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600">${fmtArs(item.total)}</td>
    </tr>`).join('');

  const body = `
${buildDocumentHeader({
  clinicName: data.clinicName,
  clinicAddress: data.clinicAddress,
  docTitle: `Comprobante ${inv.number}`,
  docMetaHtml: `<div style="font-size:11px;color:${BRAND.faint};margin-top:4px">${new Date(inv.createdAt).toLocaleDateString('es-AR')}</div>`,
  logoUrl: data.logoUrl,
})}
<div style="background:${BRAND.surface};padding:12px;border-radius:8px;margin-bottom:16px;border:1px solid ${BRAND.border}">
  <div style="font-weight:700;color:#1e293b">${inv.patient?.lastName}, ${inv.patient?.firstName}</div>
  <div style="font-size:12px;color:${BRAND.muted}">${inv.socialWorkName ?? 'Particular'}</div>
</div>
<table class="doc-table" style="border:1px solid ${BRAND.border}">
  <thead><tr>
    <th>Prestación</th><th>Diente</th><th style="text-align:right">Importe</th>
  </tr></thead><tbody>${rows}</tbody>
</table>
<div style="text-align:right;margin-top:16px;font-size:16px;font-weight:800;color:${BRAND.primaryDark}">Total: ${fmtArs(Number(inv.total))}</div>
${inv.notes ? `<p style="margin-top:12px;font-style:italic;color:${BRAND.muted}">${inv.notes}</p>` : ''}
${buildDocumentFooter({ clinicName: data.clinicName, showSignature: false })}`;

  return docShell(body, `Comprobante ${inv.number}`, '600px');
}

export function buildPrescriptionDocumentHtml(
  p: any,
  patient: any,
  clinicSettings: Record<string, string>,
): string {
  const clinicName = clinicSettings['clinic_name'] ?? 'Mi consultorio';
  const clinicAddress = clinicSettings['clinic_address'] ?? '';
  const logoUrl = clinicSettings['clinic_logo_url'] || getLogoAbsoluteUrl();
  const date = new Date(p.createdAt).toLocaleDateString('es-AR');

  if (p.type === 'recipe') {
    return buildRecipeHtml({
      patient,
      dentist: p.dentist,
      items: p.items,
      diagnosis: p.diagnosis ?? '',
      notes: p.notes ?? '',
      clinicName,
      clinicAddress,
      date,
      logoUrl,
    });
  }

  return buildBudgetHtml({
    patient,
    dentist: p.dentist,
    items: p.items,
    subtotal: Number(p.subtotal),
    discountPercent: Number(p.discountPercent ?? 0),
    total: Number(p.total),
    notes: p.notes ?? '',
    clinicName,
    clinicAddress,
    date,
    validUntil: p.validUntil ? new Date(p.validUntil).toLocaleDateString('es-AR') : '',
    logoUrl,
  });
}

/** @deprecated Usar docShell con documentPrintButton integrado */
export function wrapForPrint(html: string): string {
  if (html.includes('print-btn')) return html;
  return html.replace('</head><body>', `</head><body>${documentPrintButton()}`);
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card_debit: 'Débito',
  card_credit: 'Crédito',
  transfer: 'Transferencia',
  mercado_pago: 'Mercado Pago',
  social_work: 'Obra social',
};

export function buildPaymentReceiptHtml(data: {
  clinicName: string;
  clinicAddress?: string;
  patient: any;
  plan: any;
  installment: any;
  paidCount: number;
  totalInstallments: number;
  logoUrl?: string;
}): string {
  const inst = data.installment;
  const paidExtra = Number(data.plan.downPayment) > 0 ? 1 : 0;

  const body = `
${buildDocumentHeader({
  clinicName: data.clinicName,
  clinicAddress: data.clinicAddress,
  docTitle: `RECIBO DE PAGO — ${inst.receiptNumber ?? '—'}`,
  logoUrl: data.logoUrl,
})}
<div style="background:#ecfeff;border:1px solid #a5f3fc;border-radius:10px;padding:14px;margin-bottom:16px">
  <div style="font-weight:700;color:#1e293b">${data.patient.lastName}, ${data.patient.firstName}</div>
  <div style="font-size:12px;color:${BRAND.muted}">DNI ${data.patient.dni}</div>
</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:16px">
  <tr><td style="padding:8px 0;color:${BRAND.muted}">Tratamiento</td><td style="padding:8px 0;text-align:right;font-weight:600">${data.plan.title}</td></tr>
  <tr><td style="padding:8px 0;color:${BRAND.muted}">Concepto</td><td style="padding:8px 0;text-align:right;font-weight:600">${inst.label}</td></tr>
  <tr><td style="padding:8px 0;color:${BRAND.muted}">Método de pago</td><td style="padding:8px 0;text-align:right">${PAYMENT_METHOD_LABELS[inst.paymentMethod] ?? inst.paymentMethod ?? '—'}</td></tr>
  <tr><td style="padding:8px 0;color:${BRAND.muted}">Fecha de pago</td><td style="padding:8px 0;text-align:right">${inst.paidAt ? new Date(inst.paidAt + 'T12:00:00').toLocaleDateString('es-AR') : '—'}</td></tr>
  <tr style="border-top:2px solid ${BRAND.border}"><td style="padding:12px 0;font-size:15px;font-weight:700">Monto abonado</td><td style="padding:12px 0;text-align:right;font-size:18px;font-weight:800;color:${BRAND.primaryDark}">${fmtArs(Number(inst.amount))}</td></tr>
  <tr><td style="padding:8px 0;color:${BRAND.muted}">Cuotas pagadas</td><td style="padding:8px 0;text-align:right">${data.paidCount} de ${data.totalInstallments + paidExtra}</td></tr>
  <tr><td style="padding:8px 0;color:${BRAND.muted}">Saldo pendiente</td><td style="padding:8px 0;text-align:right;font-weight:600;color:#d97706">${fmtArs(Number(data.plan.pendingAmount))}</td></tr>
</table>
${buildDocumentFooter({ clinicName: data.clinicName, showSignature: false })}`;

  return docShell(body, `Recibo ${inst.receiptNumber ?? ''}`, '560px');
}

export { openPrintWindow, getLogoAbsoluteUrl };
