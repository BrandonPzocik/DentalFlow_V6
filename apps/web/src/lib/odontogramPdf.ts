import {
  TOOTH_STATUS_COLORS, TOOTH_STATUS_LABELS, ToothStatus, ToothSurface,
  Odontogram, UPPER_RIGHT, UPPER_LEFT, LOWER_LEFT, LOWER_RIGHT,
} from '@dentaflow/shared';

const SURFACE_LABELS: Record<ToothSurface, string> = {
  [ToothSurface.MESIAL]:     'Mesial',
  [ToothSurface.DISTAL]:     'Distal',
  [ToothSurface.OCCLUSAL]:   'Oclusal',
  [ToothSurface.VESTIBULAR]: 'Vestibular',
  [ToothSurface.PALATAL]:    'Palatino/Lingual',
};

function toothSvg(num: number, record: Odontogram[number] | undefined, size = 36): string {
  const cx = size / 2, cy = size / 2, r = size * 0.38, s = r * 0.42;
  const isAbsent = record?.generalStatus === ToothStatus.ABSENT;
  const generalColor = record?.generalStatus ? TOOTH_STATUS_COLORS[record.generalStatus] : '#ffffff';

  const surfaces = [
    { key: ToothSurface.VESTIBULAR, d: `M${cx-r},${cy-r} L${cx+r},${cy-r} L${cx+s},${cy-s} L${cx-s},${cy-s}Z` },
    { key: ToothSurface.PALATAL,    d: `M${cx-r},${cy+r} L${cx+r},${cy+r} L${cx+s},${cy+s} L${cx-s},${cy+s}Z` },
    { key: ToothSurface.MESIAL,     d: `M${cx-r},${cy-r} L${cx-s},${cy-s} L${cx-s},${cy+s} L${cx-r},${cy+r}Z` },
    { key: ToothSurface.DISTAL,     d: `M${cx+r},${cy-r} L${cx+s},${cy-s} L${cx+s},${cy+s} L${cx+r},${cy+r}Z` },
    { key: ToothSurface.OCCLUSAL,   d: `M${cx-s},${cy-s} L${cx+s},${cy-s} L${cx+s},${cy+s} L${cx-s},${cy+s}Z` },
  ];

  const surfacePaths = surfaces.map(({ key, d }) => {
    const sr = record?.surfaces[key];
    const fill = sr ? TOOTH_STATUS_COLORS[sr.status] : 'transparent';
    const opacity = fill === 'transparent' ? '0' : '0.85';
    return `<path d="${d}" fill="${fill}" fill-opacity="${opacity}" stroke="#d1d5db" stroke-width="0.3"/>`;
  }).join('');

  const absenceX = isAbsent
    ? `<line x1="${cx-5}" y1="${cy-5}" x2="${cx+5}" y2="${cy+5}" stroke="#9ca3af" stroke-width="1.5" stroke-linecap="round"/>
       <line x1="${cx+5}" y1="${cy-5}" x2="${cx-5}" y2="${cy+5}" stroke="#9ca3af" stroke-width="1.5" stroke-linecap="round"/>`
    : '';

  const genDot = (!isAbsent && record?.generalStatus && record.generalStatus !== ToothStatus.HEALTHY)
    ? `<circle cx="${cx}" cy="${cy}" r="3.5" fill="${generalColor}" stroke="white" stroke-width="0.8"/>`
    : '';

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${cx-r}" y="${cy-r}" width="${r*2}" height="${r*2}" rx="3" fill="${isAbsent ? '#f3f4f6' : '#ffffff'}" stroke="#9ca3af" stroke-width="0.8"/>
    ${isAbsent ? '' : surfacePaths}
    ${absenceX}
    ${genDot}
    <text x="${cx}" y="${size-2}" text-anchor="middle" font-size="5.5" fill="#6b7280" font-family="monospace">${num}</text>
  </svg>`;
}

function buildRow(teeth: number[], odontogram: Odontogram): string {
  return teeth.map(n =>
    `<td style="padding:1px;text-align:center;vertical-align:middle">${toothSvg(n, odontogram[n], 38)}</td>`
  ).join('');
}

function buildHistoryRows(odontogram: Odontogram): string {
  const allTeeth = [...UPPER_RIGHT, ...UPPER_LEFT, ...LOWER_LEFT, ...LOWER_RIGHT];
  const rows: string[] = [];

  for (const num of allTeeth) {
    const rec = odontogram[num];
    if (!rec) continue;
    const hasTreatment = rec.generalStatus !== ToothStatus.HEALTHY || Object.keys(rec.surfaces).length > 0;
    if (!hasTreatment) continue;

    const color = TOOTH_STATUS_COLORS[rec.generalStatus];
    const surfaceDetails = Object.entries(rec.surfaces).map(([surf, sr]) =>
      `<div><b>${SURFACE_LABELS[surf as ToothSurface] ?? surf}:</b> ${TOOTH_STATUS_LABELS[sr.status]}${sr.material ? ` (${sr.material})` : ''}${sr.date ? ` · ${new Date(sr.date).toLocaleDateString('es-AR')}` : ''}${sr.performedBy ? ` · ${sr.performedBy}` : ''}</div>`
    ).join('');

    rows.push(`
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;font-weight:700;color:#1e293b;white-space:nowrap;vertical-align:top">
          <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${color};margin-right:6px;vertical-align:middle"></span>Pieza ${num}
        </td>
        <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;color:#475569;vertical-align:top">
          ${TOOTH_STATUS_LABELS[rec.generalStatus]}${rec.notes ? `<br><span style="font-size:11px;color:#94a3b8;font-style:italic">${rec.notes}</span>` : ''}
        </td>
        <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:12px;vertical-align:top">${surfaceDetails || '—'}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;color:#94a3b8;font-size:11px;vertical-align:top;white-space:nowrap">
          ${rec.updatedAt ? new Date(rec.updatedAt).toLocaleDateString('es-AR') : '—'}
        </td>
      </tr>`);
  }

  if (rows.length === 0) {
    return `<tr><td colspan="4" style="padding:20px;text-align:center;color:#94a3b8;font-style:italic">Sin intervenciones registradas</td></tr>`;
  }
  return rows.join('');
}

export function generateOdontogramPdf(patient: any, odontogram: Odontogram, clinicName = 'DentaFlow'): void {
  const generated = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
  const age = (() => {
    const b = new Date(patient.dateOfBirth);
    const t = new Date();
    let a = t.getFullYear() - b.getFullYear();
    if (t.getMonth() - b.getMonth() < 0 || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--;
    return a;
  })();

  const legendItems = [
    ToothStatus.FILLING, ToothStatus.CROWN, ToothStatus.CAVITY,
    ToothStatus.ROOT_CANAL, ToothStatus.ABSENT, ToothStatus.IMPLANT,
    ToothStatus.EXTRACTION, ToothStatus.SEALANT, ToothStatus.FRACTURE, ToothStatus.BRIDGE,
  ].map(s =>
    `<div style="display:flex;align-items:center;gap:5px;margin-bottom:4px">
      <div style="width:12px;height:12px;border-radius:3px;background:${TOOTH_STATUS_COLORS[s]};border:1px solid #e2e8f0;flex-shrink:0"></div>
      <span style="font-size:11px;color:#475569">${TOOTH_STATUS_LABELS[s]}</span>
    </div>`
  ).join('');

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Odontograma — ${patient.lastName}, ${patient.firstName}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#334155;font-size:13px;line-height:1.5}
@page{size:A4;margin:15mm 12mm}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.no-print{display:none!important}}
.print-btn{position:fixed;top:14px;right:14px;background:#0d9488;color:#fff;border:none;border-radius:8px;padding:10px 22px;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 4px 14px rgba(13,148,136,.4)}
.print-btn:hover{background:#0f766e}
.section-title{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#0d9488;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:8px}
.history-table{width:100%;border-collapse:collapse;font-size:12px}
.history-table thead tr{background:#0d9488}
.history-table thead th{padding:9px 10px;text-align:left;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.06em}
.history-table tbody tr:nth-child(even){background:#f8fafc}
.sign-box{border-top:1px solid #94a3b8;padding-top:5px;min-width:180px;text-align:center;font-size:10px}
</style></head><body>
<button class="no-print print-btn" onclick="window.print()">🖨️ Imprimir / PDF</button>

<!-- Header -->
<div style="display:flex;align-items:flex-start;justify-content:space-between;padding-bottom:16px;border-bottom:3px solid #0d9488;margin-bottom:20px">
  <div style="display:flex;align-items:center;gap:12px">
    <div style="width:42px;height:42px;background:#0d9488;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px">🦷</div>
    <div>
      <div style="font-size:18px;font-weight:800;color:#0f172a;letter-spacing:-.02em">${clinicName}</div>
      <div style="font-size:11px;color:#64748b">Sistema de Gestión Odontológica</div>
    </div>
  </div>
  <div>
    <div style="font-size:15px;font-weight:700;color:#0f766e">Odontograma Clínico</div>
    <div style="font-size:11px;color:#94a3b8;text-align:right">Generado el ${generated}</div>
  </div>
</div>

<!-- Patient info -->
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px">
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px">
    <div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:3px">Paciente</div>
    <div style="font-size:14px;font-weight:700;color:#1e293b">${patient.lastName}, ${patient.firstName}</div>
    <div style="font-size:11px;color:#64748b">DNI ${patient.dni} · ${age} años</div>
  </div>
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px">
    <div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:3px">Cobertura</div>
    <div style="font-size:14px;font-weight:700;color:#1e293b">${patient.socialWork ?? 'Particular'}</div>
    <div style="font-size:11px;color:#64748b">${patient.affiliateNumber ? `Afil. Nº ${patient.affiliateNumber}` : patient.plan ?? '—'}</div>
  </div>
  ${patient.hasAllergies
    ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:12px 14px">
         <div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:3px">⚠ Alergias</div>
         <div style="font-size:14px;font-weight:700;color:#dc2626">Paciente alérgico</div>
         <div style="font-size:11px;color:#ef4444">${patient.allergiesDetail ?? 'Ver notas'}</div>
       </div>`
    : `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px">
         <div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:3px">Contacto</div>
         <div style="font-size:13px;font-weight:600;color:#1e293b">${patient.phone}</div>
         <div style="font-size:11px;color:#64748b">${patient.email ?? ''}</div>
       </div>`}
</div>

<!-- Odontogram -->
<div class="section-title">
  <span style="background:#0d9488;color:white;border-radius:4px;padding:2px 7px;font-size:10px">FDI</span>
  Odontograma — Dentición permanente
</div>
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:16px">
  <table style="border-collapse:collapse;margin:0 auto">
    <tr><td colspan="17" style="text-align:center;font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:#0d9488;font-weight:700;padding-bottom:6px">▲ Arcada superior</td></tr>
    <tr>
      ${buildRow(UPPER_RIGHT, odontogram)}
      <td style="padding:0 8px;vertical-align:middle"><div style="width:1px;height:40px;background:#e2e8f0"></div></td>
      ${buildRow(UPPER_LEFT, odontogram)}
    </tr>
    <tr><td colspan="17" style="padding:5px 0;font-size:9px;text-align:center;color:#cbd5e1;border-top:1px dashed #e2e8f0;border-bottom:1px dashed #e2e8f0">─── Plano de oclusión ───</td></tr>
    <tr>
      ${buildRow(LOWER_LEFT, odontogram)}
      <td style="padding:0 8px;vertical-align:middle"><div style="width:1px;height:40px;background:#e2e8f0"></div></td>
      ${buildRow(LOWER_RIGHT, odontogram)}
    </tr>
    <tr><td colspan="17" style="text-align:center;font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:#64748b;padding-top:6px">▼ Arcada inferior</td></tr>
  </table>
</div>

<!-- Legend -->
<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:0 12px;margin-bottom:20px;padding:12px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px">
  ${legendItems}
</div>

<!-- History table -->
<div class="section-title">📋 Historial de intervenciones</div>
<table class="history-table">
  <thead>
    <tr>
      <th style="width:80px">Pieza</th>
      <th style="width:130px">Estado</th>
      <th>Detalle de caras</th>
      <th style="width:90px">Última mod.</th>
    </tr>
  </thead>
  <tbody>${buildHistoryRows(odontogram)}</tbody>
</table>

<!-- Footer -->
<div style="margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:flex-end;font-size:10px;color:#94a3b8">
  <div>
    <div><strong>${clinicName}</strong> — Sistema DentaFlow</div>
    <div>Documento generado el ${generated} · Historia clínica electrónica</div>
  </div>
  <div class="sign-box">Firma y sello del profesional</div>
</div>
</body></html>`;

  const win = window.open('', '_blank', 'width=900,height=750');
  if (!win) { alert('Permitir ventanas emergentes para generar el PDF'); return; }
  win.document.write(html);
  win.document.close();
}
