import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter, Receipt, Download, CheckCircle, Clock, XCircle, Send } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { billingApi, socialWorksApi } from '@/api';
import { cn } from '@/lib/utils';
import { NewInvoiceModal } from '@/components/billing/NewInvoiceModal';
import { InvoiceDetailModal } from '@/components/billing/InvoiceDetailModal';
import { LiquidationModal } from '@/components/billing/LiquidationModal';

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

export function BillingPage() {
  const qc = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [from, setFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showNew, setShowNew] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showLiquidation, setShowLiquidation] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', statusFilter, from, to, page],
    queryFn: () => billingApi.list({
      status: statusFilter || undefined,
      from: from + 'T00:00:00',
      to: to + 'T23:59:59',
      page, limit: 25,
    }).then((r) => r.data),
    placeholderData: (p) => p,
  });

  const { data: summary } = useQuery({
    queryKey: ['financial-summary', from, to],
    queryFn: () => billingApi.summary(from + 'T00:00:00', to + 'T23:59:59').then((r) => r.data),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      billingApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  });

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Facturación</h1>
          <p className="text-slate-500 text-sm mt-0.5">Gestión de ingresos y liquidaciones</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setShowLiquidation(true)}>
            <Download size={16} />
            Liquidación OS
          </button>
          <button className="btn-primary" onClick={() => setShowNew(true)}>
            <Plus size={16} />
            Nueva factura
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total facturado', value: summary.total, color: 'bg-slate-800' },
            { label: 'Cobrado', value: summary.paid, color: 'bg-emerald-600' },
            { label: 'Pendiente', value: summary.pending, color: 'bg-amber-500' },
            { label: 'OS pendiente', value: summary.socialWorkPending, color: 'bg-indigo-600' },
          ].map((c) => (
            <div key={c.label} className="card p-4">
              <p className="text-xs text-slate-500 font-medium mb-1">{c.label}</p>
              <p className={cn('text-lg font-bold', c.color === 'bg-slate-800' ? 'text-slate-800' :
                c.color === 'bg-emerald-600' ? 'text-emerald-700' :
                c.color === 'bg-amber-500' ? 'text-amber-700' : 'text-indigo-700')}>
                {formatCurrency(c.value)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label">Desde</label>
            <input type="date" className="input w-40" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input type="date" className="input w-40" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
          </div>
          <div>
            <label className="label">Estado</label>
            <select className="input w-40" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">Todos</option>
              {Object.entries(STATUS_STYLES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {['Nº', 'Paciente', 'Fecha', 'Método', 'Total', 'Pendiente', 'Estado', ''].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-slate-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data?.data?.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-400">
                  <Receipt className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                  No hay facturas en este período
                </td>
              </tr>
            ) : data?.data?.map((inv: any) => {
              const st = STATUS_STYLES[inv.status] ?? STATUS_STYLES.draft;
              return (
                <tr key={inv.id} className="hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedInvoice(inv)}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{inv.number}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">
                      {inv.patient?.lastName}, {inv.patient?.firstName}
                    </p>
                    <p className="text-xs text-slate-400">{inv.socialWorkName ?? 'Particular'}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Date(inv.createdAt).toLocaleDateString('es-AR')}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {PM_LABELS[inv.paymentMethod] ?? inv.paymentMethod}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {formatCurrency(inv.total)}
                  </td>
                  <td className="px-4 py-3">
                    {Number(inv.pendingAmount) > 0 ? (
                      <span className="text-amber-600 font-medium">{formatCurrency(inv.pendingAmount)}</span>
                    ) : (
                      <span className="text-emerald-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('badge', st.bg, st.text)}>{st.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      {inv.status === 'issued' && (
                        <button
                          className="btn-ghost btn-sm py-1 text-purple-600 hover:bg-purple-50"
                          title="Marcar como presentada"
                          onClick={() => statusMutation.mutate({ id: inv.id, status: 'submitted' })}
                        >
                          <Send size={13} />
                        </button>
                      )}
                      {['issued', 'submitted'].includes(inv.status) && (
                        <button
                          className="btn-ghost btn-sm py-1 text-emerald-600 hover:bg-emerald-50"
                          title="Marcar como cobrada"
                          onClick={() => statusMutation.mutate({ id: inv.id, status: 'paid' })}
                        >
                          <CheckCircle size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">Página {data.page} de {data.totalPages} — {data.total} facturas</p>
            <div className="flex gap-2">
              <button className="btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Anterior</button>
              <button className="btn-secondary btn-sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente</button>
            </div>
          </div>
        )}
      </div>

      {showNew && (
        <NewInvoiceModal
          onClose={() => setShowNew(false)}
          onSuccess={() => { qc.invalidateQueries({ queryKey: ['invoices'] }); qc.invalidateQueries({ queryKey: ['financial-summary'] }); setShowNew(false); }}
        />
      )}
      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onUpdate={() => { qc.invalidateQueries({ queryKey: ['invoices'] }); setSelectedInvoice(null); }}
        />
      )}
      {showLiquidation && (
        <LiquidationModal onClose={() => setShowLiquidation(false)} />
      )}
    </div>
  );
}
