const fmtArs = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n ?? 0);

export function buildRecipeHtml(data: {
  patient: any;
  dentist: any;
  items: any[];
  diagnosis: string;
  notes: string;
  clinicName: string;
  clinicAddress: string;
  date: string;
}): string {
  const rows = data.items.map((i: any) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-weight:600;color:#1e293b;font-size:14px">Rp/ ${i.drug}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;color:#475569;font-size:13px">${i.dose}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px">${i.frequency} · ${i.duration}</td>
    </tr>
    ${i.notes ? `<tr><td colspan="3" style="padding:2px 12px 10px;font-size:12px;color:#94a3b8;font-style:italic;border-bottom:1px solid #f1f5f9">${i.notes}</td></tr>` : ''}
  `).join('');

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Receta — ${data.patient.lastName}, ${data.patient.firstName}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#334155;font-size:13px}</style></head><body>
<div style="max-width:520px;margin:0 auto;padding:16px">
  <div style="display:flex;justify-content:space-between;padding-bottom:16px;border-bottom:3px solid #0d9488;margin-bottom:20px">
    <div><div style="font-size:16px;font-weight:800;color:#0f172a">${data.clinicName}</div>
    ${data.clinicAddress ? `<div style="font-size:11px;color:#64748b">${data.clinicAddress}</div>` : ''}</div>
    <div style="text-align:right"><div style="font-size:14px;font-weight:700;color:#0f766e">RECETA MÉDICA</div>
    <div style="font-size:11px;color:#94a3b8">Fecha: ${data.date}</div></div>
  </div>
  <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:10px;padding:14px 16px;margin-bottom:20px">
    <div style="font-size:14px;font-weight:700">${data.patient.lastName}, ${data.patient.firstName} · DNI ${data.patient.dni}</div>
    ${data.diagnosis ? `<div style="margin-top:8px;font-size:13px"><strong>Diagnóstico:</strong> ${data.diagnosis}</div>` : ''}
  </div>
  <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:20px">
    <thead><tr style="background:#0d9488">
      <th style="padding:9px 12px;text-align:left;font-size:11px;color:#fff">Medicamento</th>
      <th style="padding:9px 12px;text-align:left;font-size:11px;color:#fff">Dosis</th>
      <th style="padding:9px 12px;text-align:left;font-size:11px;color:#fff">Posología</th>
    </thead><tbody>${rows}</tbody>
  </table>
  ${data.notes ? `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:9px;padding:12px;margin-bottom:20px">${data.notes}</div>` : ''}
  <div style="font-size:11px;color:#94a3b8;padding-top:14px;border-top:1px solid #e2e8f0">
    Dr. ${data.dentist?.lastName ?? ''}, ${data.dentist?.firstName ?? ''}
    ${data.dentist?.licenseNumber ? ` · Mat. ${data.dentist.licenseNumber}` : ''}
  </div>
</div></body></html>`;
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
}): string {
  const rows = data.items.map((i: any, idx: number) => `
    <tr style="${idx % 2 === 0 ? 'background:#f8fafc' : 'background:#fff'}">
      <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9">${i.description}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${i.toothNumber ?? '—'}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${i.quantity}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;text-align:right">${fmtArs(i.unitPrice)}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:#0f766e">${fmtArs(i.total)}</td>
    </tr>`).join('');
  const discountAmt = data.subtotal * (data.discountPercent / 100);

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Presupuesto — ${data.patient.lastName}, ${data.patient.firstName}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#334155;font-size:13px}</style></head><body>
<div style="max-width:680px;margin:0 auto;padding:16px">
  <div style="display:flex;justify-content:space-between;padding-bottom:16px;border-bottom:3px solid #0d9488;margin-bottom:20px">
    <div><div style="font-size:17px;font-weight:800">${data.clinicName}</div>
    ${data.clinicAddress ? `<div style="font-size:11px;color:#64748b">${data.clinicAddress}</div>` : ''}</div>
    <div style="text-align:right"><div style="font-size:15px;font-weight:700;color:#0f766e">PRESUPUESTO</div>
    <div style="font-size:11px;color:#94a3b8">Emitido: ${data.date}</div>
    ${data.validUntil ? `<div style="font-size:11px;color:#d97706">Válido hasta: ${data.validUntil}</div>` : ''}</div>
  </div>
  <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:10px;padding:14px;margin-bottom:20px">
    <div style="font-size:15px;font-weight:700">${data.patient.lastName}, ${data.patient.firstName}</div>
    <div style="font-size:12px;color:#64748b">DNI ${data.patient.dni}</div>
  </div>
  <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;margin-bottom:16px">
    <thead><tr style="background:#0d9488">
      <th style="padding:9px 12px;text-align:left;color:#fff;font-size:11px">Prestación</th>
      <th style="padding:9px 12px;color:#fff;font-size:11px">Pieza</th>
      <th style="padding:9px 12px;color:#fff;font-size:11px">Cant.</th>
      <th style="padding:9px 12px;text-align:right;color:#fff;font-size:11px">P.Unit.</th>
      <th style="padding:9px 12px;text-align:right;color:#fff;font-size:11px">Total</th>
    </thead><tbody>${rows}</tbody>
  </table>
  <div style="text-align:right;margin-bottom:20px">
    ${data.discountPercent > 0 ? `<div>Subtotal: ${fmtArs(data.subtotal)} · Descuento (${data.discountPercent}%): -${fmtArs(discountAmt)}</div>` : ''}
    <div style="font-size:18px;font-weight:800;color:#0f766e;margin-top:8px">TOTAL: ${fmtArs(data.total)}</div>
  </div>
  ${data.notes ? `<div style="background:#fff7ed;border:1px solid #fed7aa;padding:12px;border-radius:9px;margin-bottom:16px">${data.notes}</div>` : ''}
  <div style="font-size:11px;color:#94a3b8">Dr. ${data.dentist?.lastName ?? ''}, ${data.dentist?.firstName ?? ''}</div>
</div></body></html>`;
}

export function buildInvoiceHtml(data: {
  invoice: any;
  clinicName: string;
  clinicAddress?: string;
}): string {
  const inv = data.invoice;
  const rows = (inv.items ?? []).map((item: any, idx: number) => `
    <tr style="${idx % 2 === 0 ? 'background:#f8fafc' : ''}">
      <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9">${item.description}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:center">${item.toothNumber ?? '—'}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600">${fmtArs(item.total)}</td>
    </tr>`).join('');

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Comprobante ${inv.number}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#334155}</style></head><body>
<div style="max-width:600px;margin:0 auto;padding:16px">
  <div style="border-bottom:3px solid #0d9488;padding-bottom:12px;margin-bottom:16px">
    <div style="font-size:17px;font-weight:800">${data.clinicName}</div>
    ${data.clinicAddress ? `<div style="font-size:11px;color:#64748b">${data.clinicAddress}</div>` : ''}
    <div style="margin-top:8px;font-size:14px;font-weight:700;color:#0f766e">Comprobante ${inv.number}</div>
  </div>
  <div style="background:#f8fafc;padding:12px;border-radius:8px;margin-bottom:16px">
    <div style="font-weight:700">${inv.patient?.lastName}, ${inv.patient?.firstName}</div>
    <div style="font-size:12px;color:#64748b">${inv.socialWorkName ?? 'Particular'} · ${new Date(inv.createdAt).toLocaleDateString('es-AR')}</div>
  </div>
  <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0">
    <thead><tr style="background:#0d9488">
      <th style="padding:8px 10px;text-align:left;color:#fff;font-size:11px">Prestación</th>
      <th style="padding:8px 10px;color:#fff;font-size:11px">Diente</th>
      <th style="padding:8px 10px;text-align:right;color:#fff;font-size:11px">Importe</th>
    </thead><tbody>${rows}</tbody>
  </table>
  <div style="text-align:right;margin-top:16px;font-size:16px;font-weight:800;color:#0f766e">Total: ${fmtArs(Number(inv.total))}</div>
  ${inv.notes ? `<p style="margin-top:12px;font-style:italic;color:#64748b">${inv.notes}</p>` : ''}
</div></body></html>`;
}

export function buildPrescriptionDocumentHtml(
  p: any,
  patient: any,
  clinicSettings: Record<string, string>,
): string {
  const clinicName = clinicSettings['clinic_name'] ?? 'DentaFlow';
  const clinicAddress = clinicSettings['clinic_address'] ?? '';
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
    validUntil: p.validUntil
      ? new Date(p.validUntil).toLocaleDateString('es-AR')
      : '',
  });
}

/** HTML con botón imprimir para ventana emergente */
export function wrapForPrint(html: string): string {
  if (html.includes('print-btn')) return html;
  return html.replace(
    '</head><body>',
    `<style>.no-print{}@media print{.no-print{display:none!important}}</style></head><body>
<button class="no-print" onclick="window.print()" style="position:fixed;top:12px;right:12px;background:#0d9488;color:#fff;border:none;border-radius:8px;padding:9px 20px;cursor:pointer">🖨️ Imprimir</button>`,
  );
}
