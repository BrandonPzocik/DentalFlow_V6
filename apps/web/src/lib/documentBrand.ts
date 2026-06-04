/** Marca DentalFlow — documentos imprimibles y plantillas HTML */
export const BRAND = {
  name: 'DentalFlow',
  tagline: 'Sistema de Gestión Odontológica',
  primary: '#06b6d4',
  primaryDark: '#0891b2',
  navy: '#1e3a5f',
  slate: '#334155',
  muted: '#64748b',
  faint: '#94a3b8',
  border: '#e2e8f0',
  surface: '#f8fafc',
} as const;

export const LOGO_PATH = '/dentalflow-logo.png';

/** URL absoluta del logo (ventanas about:blank de impresión no resuelven rutas relativas). */
export function getLogoAbsoluteUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return new URL(LOGO_PATH, window.location.origin).href;
  }
  return LOGO_PATH;
}

export function documentBaseStyles(): string {
  return `
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,Arial,sans-serif;background:#fff;color:${BRAND.slate};font-size:13px;line-height:1.5}
@page{size:A4;margin:14mm 12mm}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.no-print{display:none!important}}
.print-btn{position:fixed;top:14px;right:14px;background:${BRAND.primaryDark};color:#fff;border:none;border-radius:8px;padding:10px 22px;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 4px 14px rgba(8,145,178,.35);z-index:9999}
.print-btn:hover{background:${BRAND.navy}}
.section-title{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:${BRAND.primaryDark};margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid ${BRAND.border};display:flex;align-items:center;gap:8px}
.doc-table thead tr{background:${BRAND.primaryDark}}
.doc-table thead th{padding:9px 10px;text-align:left;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.06em}
.doc-table{width:100%;border-collapse:collapse;font-size:12px}
.doc-table tbody tr:nth-child(even){background:${BRAND.surface}}
.sign-box{border-top:1px solid ${BRAND.faint};padding-top:5px;min-width:180px;text-align:center;font-size:10px;color:${BRAND.muted}}
`;
}

export function documentPrintButton(): string {
  return `<button type="button" class="no-print print-btn" onclick="window.print()">🖨️ Imprimir / PDF</button>`;
}

export interface DocumentHeaderOptions {
  clinicName: string;
  clinicAddress?: string;
  docTitle: string;
  docMetaHtml?: string;
  logoUrl?: string;
}

export function buildDocumentHeader(opts: DocumentHeaderOptions): string {
  const logo = opts.logoUrl ?? getLogoAbsoluteUrl();
  const address = opts.clinicAddress
    ? `<div style="font-size:11px;color:${BRAND.muted};margin-top:2px">${opts.clinicAddress}</div>`
    : `<div style="font-size:11px;color:${BRAND.muted};margin-top:2px">${BRAND.tagline}</div>`;

  return `
<div style="display:flex;align-items:flex-start;justify-content:space-between;padding-bottom:14px;border-bottom:3px solid ${BRAND.primary};margin-bottom:18px;gap:16px">
  <div style="display:flex;align-items:center;gap:14px;min-width:0;flex:1">
    <img src="${logo}" alt="${BRAND.name}" style="height:56px;width:auto;max-width:280px;object-fit:contain;flex-shrink:0;display:block" />
    <div style="min-width:0">
      <div style="font-size:17px;font-weight:800;color:${BRAND.navy};letter-spacing:-.02em;line-height:1.2">${opts.clinicName}</div>
      ${address}
    </div>
  </div>
  <div style="text-align:right;flex-shrink:0">
    <div style="font-size:15px;font-weight:700;color:${BRAND.primaryDark}">${opts.docTitle}</div>
    ${opts.docMetaHtml ?? ''}
  </div>
</div>`;
}

export interface DocumentFooterOptions {
  clinicName: string;
  extraLine?: string;
  showSignature?: boolean;
}

export function buildDocumentFooter(opts: DocumentFooterOptions): string {
  const generated = new Date().toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const signature = opts.showSignature !== false
    ? `<div class="sign-box">Firma y sello del profesional</div>`
    : '';

  return `
<div style="margin-top:20px;padding-top:12px;border-top:1px solid ${BRAND.border};display:flex;justify-content:space-between;align-items:flex-end;gap:16px;font-size:10px;color:${BRAND.faint}">
  <div>
    <div><strong style="color:${BRAND.muted}">${opts.clinicName}</strong> · ${BRAND.name}</div>
    <div>${opts.extraLine ?? `Documento generado el ${generated}`}</div>
  </div>
  ${signature}
</div>`;
}

export function patientInfoCard(html: string, variant: 'default' | 'alert' = 'default'): string {
  const bg = variant === 'alert' ? '#fef2f2' : BRAND.surface;
  const border = variant === 'alert' ? '#fecaca' : BRAND.border;
  return `<div style="background:${bg};border:1px solid ${border};border-radius:10px;padding:12px 14px">${html}</div>`;
}

export function openPrintWindow(html: string, width = 900, height = 750): void {
  const win = window.open('', '_blank', `width=${width},height=${height}`);
  if (!win) {
    alert('Permitir ventanas emergentes para generar el documento');
    return;
  }
  win.document.write(html);
  win.document.close();
}
