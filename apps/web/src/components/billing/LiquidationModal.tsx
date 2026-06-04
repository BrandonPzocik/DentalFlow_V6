import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, FileText, Printer } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { billingApi, socialWorksApi, settingsApi } from '@/api';
import { Modal } from '@/components/ui/Modal';
import {
  BRAND,
  buildDocumentFooter,
  buildDocumentHeader,
  documentBaseStyles,
  documentPrintButton,
  getLogoAbsoluteUrl,
  openPrintWindow,
} from '@/lib/documentBrand';

interface Props { onClose: () => void; }

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
  }).format(n ?? 0);
}

function buildPdfHtml(data: {
  sw: any;
  from: string;
  to: string;
  liquidation: any[];
  total: number;
  clinicName: string;
}) {
  const { sw, from, to, liquidation, total, clinicName } = data;
  const generated = new Date().toLocaleDateString('es-AR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const rows = (liquidation as any[]).map((inv: any) => {
    const prestacionRows = inv.items?.map((i: any) =>
      `<tr>
        <td colspan="2" style="padding:3px 6px 3px 12px;font-size:12px;color:#475569">
          ${i.nomenclatorCode ? `<span style="font-family:monospace;background:#f1f5f9;padding:1px 4px;border-radius:3px;font-size:10px;color:#64748b">${i.nomenclatorCode}</span> ` : ''}${i.description}
          ${i.toothNumber ? `<span style="color:#94a3b8;font-size:10px"> · Diente ${i.toothNumber}</span>` : ''}
        </td>
        <td style="padding:3px 6px;font-size:11px;color:#64748b;text-align:center">${i.quantity ?? 1}</td>
        <td style="padding:3px 6px;font-size:11px;color:#475569;text-align:right;white-space:nowrap">${fmt(Number(i.unitPrice))}</td>
        <td style="padding:3px 6px;font-size:12px;font-weight:600;color:#0f766e;text-align:right;white-space:nowrap">${fmt(Number(i.total ?? i.unitPrice))}</td>
      </tr>`
    ).join('') ?? '';

    return `
      <tr style="background:#f8fafc">
        <td colspan="7" style="padding:8px 12px 2px;font-weight:700;color:#1e293b;font-size:13px;border-top:2px solid #e2e8f0">
          ${inv.patient?.lastName ?? ''}, ${inv.patient?.firstName ?? ''}
          <span style="font-weight:400;font-size:11px;color:#94a3b8;margin-left:8px">
            ${new Date(inv.createdAt).toLocaleDateString('es-AR')} · Afiliado: ${inv.affiliateNumber ?? '—'} · Plan: ${inv.plan ?? '—'}
          </span>
        </td>
      </tr>
      ${prestacionRows}
      <tr>
        <td colspan="5" style="padding:4px 12px 10px;font-size:11px;color:#94a3b8;text-align:right">Subtotal prestaciones</td>
        <td colspan="2" style="padding:4px 12px 10px;font-size:13px;font-weight:700;color:#0f766e;text-align:right;white-space:nowrap">
          ${fmt(inv.total)}
        </td>
      </tr>`;
  }).join('');

  const logoUrl = getLogoAbsoluteUrl();

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Liquidación ${sw?.name} — ${from} al ${to}</title>
  <style>
    ${documentBaseStyles()}

    /* ── INFO PILLS ─── */
    .info-row {
      display: flex;
      gap: 12px;
      margin-bottom: 22px;
      flex-wrap: wrap;
    }
    .pill {
      background: #ecfeff;
      border: 1px solid #a5f3fc;
      border-radius: 8px;
      padding: 10px 16px;
      flex: 1;
      min-width: 140px;
    }
    .pill-label { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: #64748b; margin-bottom: 3px; }
    .pill-value { font-size: 14px; font-weight: 700; color: ${BRAND.primaryDark}; }

    /* ── TABLE ─── */
    table { width: 100%; border-collapse: collapse; }
    thead tr {
      background: ${BRAND.primaryDark};
    }
    thead th {
      padding: 10px 12px;
      text-align: left;
      font-size: 11px;
      font-weight: 600;
      color: #fff;
      letter-spacing: .05em;
      text-transform: uppercase;
    }
    thead th:last-child { text-align: right; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    tbody tr:hover { background: #ecfeff; }

    /* ── TOTALS ─── */
    .totals-box {
      margin-top: 20px;
      display: flex;
      justify-content: flex-end;
    }
    .totals-inner {
      background: ${BRAND.primaryDark};
      border-radius: 10px;
      padding: 14px 24px;
      min-width: 220px;
    }
    .totals-label { font-size: 11px; color: rgba(255,255,255,.75); text-transform: uppercase; letter-spacing:.05em; }
    .totals-amount { font-size: 22px; font-weight: 800; color: #fff; margin-top: 2px; }
    .totals-count  { font-size: 11px; color: rgba(255,255,255,.65); margin-top: 3px; }

  </style>
</head>
<body>

  ${documentPrintButton()}

  ${buildDocumentHeader({
    clinicName,
    docTitle: 'Liquidación de Prestaciones',
    docMetaHtml: `<div style="font-size:11px;color:${BRAND.muted};margin-top:4px;line-height:1.6;text-align:right">
      Obra Social: <strong>${sw?.name ?? ''}</strong><br>
      Período: ${from} al ${to}<br>
      Generado: ${generated}
    </div>`,
    logoUrl,
  })}

  <!-- Info pills -->
  <div class="info-row">
    <div class="pill">
      <div class="pill-label">Obra Social</div>
      <div class="pill-value">${sw?.name ?? '—'}</div>
    </div>
    <div class="pill">
      <div class="pill-label">Período</div>
      <div class="pill-value">${from} → ${to}</div>
    </div>
    <div class="pill">
      <div class="pill-label">Prestaciones</div>
      <div class="pill-value">${liquidation.length}</div>
    </div>
    <div class="pill">
      <div class="pill-label">Total a liquidar</div>
      <div class="pill-value">${fmt(total)}</div>
    </div>
  </div>

  <!-- Table -->
  <table>
    <thead>
      <tr>
        <th>Paciente</th>
        <th>N° Afiliado</th>
        <th>Plan</th>
        <th>Fecha</th>
        <th>Prestaciones</th>
        <th style="text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${rows.length ? rows : '<tr><td colspan="6" style="text-align:center;padding:24px;color:#94a3b8">Sin prestaciones en el período seleccionado</td></tr>'}
    </tbody>
  </table>

  <!-- Totals -->
  <div class="totals-box">
    <div class="totals-inner">
      <div class="totals-label">Total a presentar</div>
      <div class="totals-amount">${fmt(total)}</div>
      <div class="totals-count">${liquidation.length} prestación${liquidation.length !== 1 ? 'es' : ''}</div>
    </div>
  </div>

  ${buildDocumentFooter({ clinicName, extraLine: `Liquidación obra social · ${generated}`, showSignature: true })}

</body>
</html>`;
}

export function LiquidationModal({ onClose }: Props) {
  const [swId, setSwId] = useState('');
  const [from, setFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [to, setTo]     = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  const { data: socialWorks = [] } = useQuery({
    queryKey: ['social-works'],
    queryFn: () => socialWorksApi.list().then((r) => r.data),
  });

  const { data: clinicSettings = {} } = useQuery({
    queryKey: ['settings-flat'],
    queryFn: () => settingsApi.getAll().then((r) => r.data),
  });

  const { data: liquidation, isLoading } = useQuery({
    queryKey: ['liquidation', swId, from, to],
    queryFn: () => billingApi.liquidation(swId, from + 'T00:00:00', to + 'T23:59:59').then((r) => r.data),
    enabled: !!swId,
  });

  const sw    = (socialWorks as any[]).find((s: any) => s.id === swId);
  const total = (liquidation as any[])?.reduce((s: number, inv: any) => s + Number(inv.total), 0) ?? 0;
  const clinicName = (clinicSettings as any)['clinic_name'] ?? 'Mi consultorio';

  function handleDownloadPdf() {
    const html = buildPdfHtml({
      sw,
      from: from.split('-').reverse().join('/'),
      to: to.split('-').reverse().join('/'),
      liquidation: liquidation as any[] ?? [],
      total,
      clinicName,
    });

    openPrintWindow(html, 900, 700);
  }

  return (
    <Modal open onClose={onClose} maxWidth="max-w-3xl" scrollable>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-teal-600" />
            <h2 className="section-heading">Liquidación de Obra Social</h2>
          </div>
          <button className="p-1.5 hover:bg-slate-100 border border-transparent transition-colors" onClick={onClose}>
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Filters */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Obra Social *</label>
              <select className="input" value={swId} onChange={(e) => setSwId(e.target.value)}>
                <option value="">Seleccionar…</option>
                {(socialWorks as any[]).map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Desde</label>
              <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="label">Hasta</label>
              <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>

          {/* Preview */}
          {swId && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-slate-800">{sw?.name}</p>
                  <p className="text-sm text-slate-500">
                    {from.split('-').reverse().join('/')} al {to.split('-').reverse().join('/')} ·{' '}
                    {isLoading ? '…' : `${(liquidation as any[])?.length ?? 0} prestaciones`}
                  </p>
                </div>
                <button
                  className="btn-primary"
                  onClick={handleDownloadPdf}
                  disabled={isLoading || !liquidation}
                >
                  <Printer size={15} />
                  Generar PDF
                </button>
              </div>

              {/* Preview table */}
              <div className="border border-slate-200 overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-teal-600 sticky top-0">
                      <tr>
                        {['Paciente', 'Afiliado', 'Plan', 'Fecha', 'Prestaciones', 'Total'].map((h) => (
                          <th key={h} className="text-left px-3 py-2.5 nav-section-label text-white">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {isLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <tr key={i}>
                            {Array.from({ length: 6 }).map((_, j) => (
                              <td key={j} className="px-3 py-3">
                                <div className="h-3 bg-slate-100 rounded animate-pulse" />
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : !(liquidation as any[])?.length ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-slate-400">
                            Sin prestaciones en el período
                          </td>
                        </tr>
                      ) : (liquidation as any[]).map((inv: any) => (
                        <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2.5 font-medium text-slate-800">
                            {inv.patient?.lastName}, {inv.patient?.firstName}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-slate-500 text-xs">
                            {inv.affiliateNumber ?? '—'}
                          </td>
                          <td className="px-3 py-2.5 text-slate-500 text-xs">{inv.plan ?? '—'}</td>
                          <td className="px-3 py-2.5 text-slate-500 text-xs whitespace-nowrap">
                            {new Date(inv.createdAt).toLocaleDateString('es-AR')}
                          </td>
                          <td className="px-3 py-2.5 text-slate-500 text-xs">
                            {inv.items?.map((i: any) => (
                              <div key={i.id}>
                                {i.nomenclatorCode && (
                                  <span className="font-mono text-slate-400">[{i.nomenclatorCode}] </span>
                                )}
                                {i.description}
                              </div>
                            ))}
                          </td>
                          <td className="px-3 py-2.5 font-medium text-teal-700 text-right whitespace-nowrap">
                            {fmt(inv.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Total row */}
                <div className="flex items-center justify-between px-4 py-3 bg-teal-600">
                  <span className="text-sm font-medium text-white">Total a liquidar</span>
                  <span className="text-lg font-medium text-white">{fmt(total)}</span>
                </div>
              </div>

              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
                <Printer size={12} />
                Al generar el PDF se abre una nueva ventana con el documento listo para imprimir o guardar.
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button className="btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
    </Modal>
  );
}
