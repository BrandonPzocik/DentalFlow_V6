import { useMutation, useQuery } from '@tanstack/react-query';
import { X, CheckCircle, Send, XCircle, DollarSign, Mail } from 'lucide-react';
import { billingApi, notificationsApi, settingsApi } from '@/api';
import { buildInvoiceHtml } from '@/lib/clinicalDocuments';
import { cn } from '@/lib/utils';

interface Props { invoice: any; onClose: () => void; onUpdate: () => void; }

const STATUS_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  draft:     { label: 'Borrador',   bg: 'bg-slate-100',   text: 'text-slate-600' },
  issued:    { label: 'Emitida',    bg: 'bg-blue-100',    text: 'text-blue-700' },
  submitted: { label: 'Presentada', bg: 'bg-purple-100',  text: 'text-purple-700' },
  paid:      { label: 'Cobrada',    bg: 'bg-emerald-100', text: 'text-emerald-700' },
  rejected:  { label: 'Rechazada', bg: 'bg-red-100',     text: 'text-red-700' },
  cancelled: { label: 'Cancelada', bg: 'bg-slate-100',   text: 'text-slate-400' },
};

const PM_LABELS: Record<string, string> = {
  cash: 'Efectivo', card_debit: 'Débito', card_credit: 'Crédito',
  transfer: 'Transferencia', mercado_pago: 'Mercado Pago', social_work: 'Obra Social',
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n ?? 0);
}

export function InvoiceDetailModal({ invoice, onClose, onUpdate }: Props) {
  const { data: clinicSettings = {} } = useQuery({
    queryKey: ['settings-flat'],
    queryFn: () => settingsApi.getAll().then((r) => r.data),
  });

  const statusMut = useMutation({
    mutationFn: ({ status, reason }: { status: string; reason?: string }) =>
      billingApi.updateStatus(invoice.id, status, reason),
    onSuccess: onUpdate,
  });
  const payMut = useMutation({
    mutationFn: (amount: number) => billingApi.registerPayment(invoice.id, amount),
    onSuccess: onUpdate,
  });

  const emailMut = useMutation({
    mutationFn: () => {
      const patient = invoice.patient;
      if (!patient?.email) throw new Error('El paciente no tiene email registrado');
      if (patient.acceptsEmail === false) throw new Error('El paciente no acepta comunicaciones por email');
      const clinicName = (clinicSettings as Record<string, string>)['clinic_name'] ?? 'DentaFlow';
      const clinicAddress = (clinicSettings as Record<string, string>)['clinic_address'] ?? '';
      const html = buildInvoiceHtml({ invoice, clinicName, clinicAddress });
      return notificationsApi.sendDocument({
        patientId: patient.id,
        subject: `Comprobante ${invoice.number} — ${patient.lastName}, ${patient.firstName}`,
        html,
        type: 'invoice',
      }).then((r) => r.data);
    },
    onSuccess: (res) => alert(res.simulated ? res.message : res.message),
    onError: (err: any) => alert(err.message ?? err.response?.data?.message ?? 'No se pudo enviar'),
  });

  const st = STATUS_STYLES[invoice.status] ?? STATUS_STYLES.draft;
  const canEmail = !!invoice.patient?.email && invoice.patient?.acceptsEmail !== false;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="modal-shell w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="section-heading">{invoice.number}</h2>
            <span className={cn('badge text-xs', st.bg, st.text)}>{st.label}</span>
          </div>
          <button className="p-1.5 hover:bg-slate-100 border border-transparent" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          <div className="bg-slate-50 border border-slate-200 p-4">
            <p className="font-medium text-slate-800">
              {invoice.patient?.lastName}, {invoice.patient?.firstName}
            </p>
            <p className="text-sm text-slate-500 mt-0.5">
              {invoice.socialWorkName ?? 'Particular'}
              {invoice.affiliateNumber && ` · Afiliado #${invoice.affiliateNumber}`}
            </p>
            <p className="text-sm text-slate-500">Método: {PM_LABELS[invoice.paymentMethod]}</p>
            <p className="text-sm text-slate-500">
              Fecha: {new Date(invoice.createdAt).toLocaleDateString('es-AR')}
            </p>
            {invoice.patient?.email && (
              <p className="text-sm text-slate-500">{invoice.patient.email}</p>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Prestaciones</p>
            <div className="divide-y divide-slate-100 border border-slate-200 overflow-hidden">
              {invoice.items?.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between px-4 py-3 bg-white">
                  <div>
                    <p className="text-sm text-slate-800">{item.description}</p>
                    {item.toothNumber && (
                      <p className="text-xs text-slate-400">Diente {item.toothNumber}{item.surface ? ` · ${item.surface}` : ''}</p>
                    )}
                    {item.nomenclatorCode && (
                      <p className="text-xs text-slate-400 font-mono">Cód. {item.nomenclatorCode}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-sm font-medium text-slate-800">{formatCurrency(item.total)}</p>
                    {item.quantity > 1 && (
                      <p className="text-xs text-slate-400">{item.quantity} × {formatCurrency(item.unitPrice)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 space-y-1.5">
            <div className="flex justify-between text-sm text-slate-500">
              <span>Subtotal</span><span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            {Number(invoice.discountAmount) > 0 && (
              <div className="flex justify-between text-sm text-red-500">
                <span>Descuento ({invoice.discountPercent}%)</span>
                <span>- {formatCurrency(invoice.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-medium text-slate-800 pt-1.5 border-t border-slate-200">
              <span>Total</span><span className="text-teal-700">{formatCurrency(invoice.total)}</span>
            </div>
            {Number(invoice.pendingAmount) > 0 && (
              <div className="flex justify-between text-sm text-amber-600 font-medium">
                <span>Pendiente</span><span>{formatCurrency(invoice.pendingAmount)}</span>
              </div>
            )}
          </div>

          {invoice.notes && (
            <p className="text-sm text-slate-500 italic">{invoice.notes}</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap gap-2">
          <button
            className="btn-secondary btn-sm text-teal-600 border-teal-200 hover:bg-teal-50"
            disabled={!canEmail || emailMut.isPending}
            title={canEmail ? 'Enviar comprobante por email' : 'Sin email o paciente no acepta email'}
            onClick={() => emailMut.mutate()}
          >
            <Mail size={13} />
            {emailMut.isPending ? 'Enviando…' : 'Enviar por email'}
          </button>
          {invoice.status === 'issued' && (
            <button className="btn-secondary btn-sm text-purple-600 border-purple-200 hover:bg-purple-50"
              onClick={() => statusMut.mutate({ status: 'submitted' })}>
              <Send size={13} /> Marcar presentada
            </button>
          )}
          {['issued', 'submitted'].includes(invoice.status) && (
            <button className="btn-secondary btn-sm text-emerald-600 border-emerald-200 hover:bg-emerald-50"
              onClick={() => statusMut.mutate({ status: 'paid' })}>
              <CheckCircle size={13} /> Marcar cobrada
            </button>
          )}
          {['issued', 'submitted'].includes(invoice.status) && (
            <button className="btn-secondary btn-sm text-red-500 border-red-200 hover:bg-red-50"
              onClick={() => statusMut.mutate({ status: 'rejected', reason: 'Rechazada manualmente' })}>
              <XCircle size={13} /> Marcar rechazada
            </button>
          )}
          {Number(invoice.pendingAmount) > 0 && invoice.status !== 'cancelled' && (
            <button className="btn-secondary btn-sm text-teal-600 border-teal-200 hover:bg-teal-50"
              onClick={() => payMut.mutate(Number(invoice.pendingAmount))}>
              <DollarSign size={13} /> Registrar pago completo
            </button>
          )}
          <button className="btn-secondary btn-sm ml-auto" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
