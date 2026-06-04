import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, CreditCard, Mail, Printer, CheckCircle2, Clock, AlertTriangle,
  Pause, XCircle, ChevronDown, ChevronUp,
} from 'lucide-react';
import { treatmentPlansApi, settingsApi } from '@/api';
import { Modal } from '@/components/ui/Modal';
import { buildPaymentReceiptHtml, getLogoAbsoluteUrl, openPrintWindow } from '@/lib/clinicalDocuments';
import { cn } from '@/lib/utils';
import { InstallmentStatus, TreatmentPlanStatus } from '@dentaflow/shared';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(n ?? 0));

const PLAN_STATUS: Record<string, { label: string; cls: string }> = {
  active: { label: 'Activo', cls: 'bg-teal-100 text-teal-800' },
  paused: { label: 'Pausado', cls: 'bg-amber-100 text-amber-800' },
  completed: { label: 'Finalizado', cls: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'Cancelado', cls: 'bg-slate-100 text-slate-600' },
};

const INST_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pendiente', cls: 'bg-slate-100 text-slate-700' },
  paid: { label: 'Pagada', cls: 'bg-emerald-100 text-emerald-800' },
  overdue: { label: 'Vencida', cls: 'bg-red-100 text-red-800' },
  waived: { label: 'Condonada', cls: 'bg-slate-100 text-slate-500' },
};

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'card_debit', label: 'Débito' },
  { value: 'card_credit', label: 'Crédito' },
  { value: 'mercado_pago', label: 'Mercado Pago' },
];

interface Props {
  patientId: string;
  patient: any;
}

export function TreatmentPlansPanel({ patientId, patient }: Props) {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [payTarget, setPayTarget] = useState<{ plan: any; installment: any } | null>(null);

  const { data: catalog = [] } = useQuery({
    queryKey: ['treatment-catalog'],
    queryFn: () => treatmentPlansApi.catalog().then((r) => r.data),
  });

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['treatment-plans', patientId],
    queryFn: () => treatmentPlansApi.byPatient(patientId).then((r) => r.data),
  });

  const { data: clinicSettings = {} } = useQuery({
    queryKey: ['settings-flat'],
    queryFn: () => settingsApi.getAll().then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: (data: any) => treatmentPlansApi.create(patientId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['treatment-plans', patientId] });
      qc.invalidateQueries({ queryKey: ['treatment-plans-overdue'] });
      setShowNew(false);
    },
  });

  const payMut = useMutation({
    mutationFn: ({ planId, installmentId, data }: any) =>
      treatmentPlansApi.payInstallment(patientId, planId, installmentId, data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['treatment-plans', patientId] });
      qc.invalidateQueries({ queryKey: ['treatment-plans-overdue'] });
      setPayTarget(null);
      const msg = res.data?.emailResult?.simulated
        ? 'Pago registrado. Email simulado (Gmail no configurado).'
        : 'Pago registrado y recibo enviado por email.';
      alert(msg);
    },
    onError: (err: any) => alert(err.response?.data?.message ?? 'Error al registrar pago'),
  });

  const receiptMut = useMutation({
    mutationFn: ({ planId, installmentId }: any) =>
      treatmentPlansApi.sendReceipt(patientId, planId, installmentId),
    onSuccess: (res) => alert(res.data?.simulated ? res.data.message : 'Recibo enviado por email'),
    onError: (err: any) => alert(err.response?.data?.message ?? 'No se pudo enviar'),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      treatmentPlansApi.updateStatus(patientId, id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['treatment-plans', patientId] }),
  });

  function printReceipt(plan: any, inst: any) {
    const paidCount = plan.installments.filter((i: any) => i.status === InstallmentStatus.PAID).length;
    const totalInstallments = plan.installments.filter((i: any) => i.number > 0).length;
    const settings = clinicSettings as Record<string, string>;
    const html = buildPaymentReceiptHtml({
      clinicName: settings['clinic_name'] ?? 'Mi consultorio',
      clinicAddress: settings['clinic_address'],
      logoUrl: settings['clinic_logo_url'] || getLogoAbsoluteUrl(),
      patient,
      plan,
      installment: inst,
      paidCount,
      totalInstallments,
    });
    openPrintWindow(html, 640, 720);
  }

  const activePlans = (plans as any[]).filter((p) => p.status === TreatmentPlanStatus.ACTIVE);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="section-heading">Planes de tratamiento</h3>
          <p className="meta-label mt-0.5">Brackets, conductos, implantes — cuotas y recibos</p>
        </div>
        <button type="button" className="btn-primary btn-sm" onClick={() => setShowNew(true)}>
          <Plus size={14} /> Nuevo plan
        </button>
      </div>

      {activePlans.length > 0 && (
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { label: 'Planes activos', value: activePlans.length, icon: CheckCircle2, cls: 'text-teal-700' },
            {
              label: 'Total pendiente',
              value: fmt(activePlans.reduce((s, p) => s + Number(p.pendingAmount), 0)),
              icon: Clock,
              cls: 'text-amber-700',
            },
            {
              label: 'Cuotas vencidas',
              value: activePlans.reduce(
                (s, p) => s + (p.installments?.filter((i: any) => i.status === InstallmentStatus.OVERDUE).length ?? 0),
                0,
              ),
              icon: AlertTriangle,
              cls: 'text-red-700',
            },
          ].map((stat) => (
            <div key={stat.label} className="panel p-3 flex items-center gap-3">
              <stat.icon size={18} className={stat.cls} />
              <div>
                <p className="meta-label">{stat.label}</p>
                <p className="text-lg font-medium text-slate-900">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="panel p-8 flex justify-center">
          <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (plans as any[]).length === 0 ? (
        <div className="panel p-10 text-center">
          <CreditCard className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm text-slate-500 mb-3">Sin planes de tratamiento</p>
          <button type="button" className="btn-primary btn-sm" onClick={() => setShowNew(true)}>
            Crear primer plan
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {(plans as any[]).map((plan) => {
            const st = PLAN_STATUS[plan.status] ?? PLAN_STATUS.active;
            const expanded = expandedId === plan.id;
            const paidInst = plan.installments?.filter((i: any) => i.status === InstallmentStatus.PAID).length ?? 0;
            const totalInst = plan.installments?.length ?? 0;
            const progress = totalInst ? Math.round((paidInst / totalInst) * 100) : 0;

            return (
              <div key={plan.id} className="panel overflow-hidden">
                <button
                  type="button"
                  className="w-full p-4 flex items-start gap-4 text-left hover:bg-slate-50/80"
                  onClick={() => setExpandedId(expanded ? null : plan.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-900">{plan.title}</span>
                      <span className={cn('badge text-xs', st.cls)}>{st.label}</span>
                      <span className="badge bg-slate-100 text-slate-600 text-xs">{plan.category}</span>
                    </div>
                    <p className="meta-label mt-1">
                      Inicio {new Date(plan.startDate + 'T12:00:00').toLocaleDateString('es-AR')}
                      {plan.toothNumber ? ` · Pieza ${plan.toothNumber}` : ''}
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-teal-600 rounded-full" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-xs text-slate-500 tabular-nums">{progress}%</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-slate-900">{fmt(plan.totalPrice)}</p>
                    <p className="text-xs text-amber-700">Pendiente: {fmt(plan.pendingAmount)}</p>
                    {expanded ? <ChevronUp size={16} className="ml-auto mt-1 text-slate-400" /> : <ChevronDown size={16} className="ml-auto mt-1 text-slate-400" />}
                  </div>
                </button>

                {expanded && (
                  <div className="border-t border-slate-200 px-4 pb-4">
                    <div className="flex gap-2 py-3 flex-wrap">
                      {plan.status === TreatmentPlanStatus.ACTIVE && (
                        <>
                          <button type="button" className="btn-secondary btn-sm" onClick={() => statusMut.mutate({ id: plan.id, status: 'paused' })}>
                            <Pause size={12} /> Pausar
                          </button>
                          <button type="button" className="btn-secondary btn-sm text-red-600" onClick={() => statusMut.mutate({ id: plan.id, status: 'cancelled' })}>
                            <XCircle size={12} /> Cancelar
                          </button>
                        </>
                      )}
                      {plan.status === TreatmentPlanStatus.PAUSED && (
                        <button type="button" className="btn-secondary btn-sm" onClick={() => statusMut.mutate({ id: plan.id, status: 'active' })}>
                          Reanudar
                        </button>
                      )}
                    </div>

                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          {['Concepto', 'Vencimiento', 'Monto', 'Estado', 'Acciones'].map((h) => (
                            <th key={h} className="text-left py-2 meta-label font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(plan.installments ?? [])
                          .sort((a: any, b: any) => a.number - b.number)
                          .map((inst: any) => {
                            const ist = INST_STATUS[inst.status] ?? INST_STATUS.pending;
                            const canPay = [InstallmentStatus.PENDING, InstallmentStatus.OVERDUE].includes(inst.status);
                            return (
                              <tr key={inst.id} className="border-b border-slate-100">
                                <td className="py-2.5">{inst.label}</td>
                                <td className="py-2.5 text-slate-600">
                                  {new Date(inst.dueDate + 'T12:00:00').toLocaleDateString('es-AR')}
                                </td>
                                <td className="py-2.5 font-medium tabular-nums">{fmt(inst.amount)}</td>
                                <td className="py-2.5">
                                  <span className={cn('badge text-xs', ist.cls)}>{ist.label}</span>
                                </td>
                                <td className="py-2.5">
                                  <div className="flex gap-1">
                                    {canPay && (
                                      <button
                                        type="button"
                                        className="btn-primary btn-sm"
                                        onClick={() => setPayTarget({ plan, installment: inst })}
                                      >
                                        Cobrar
                                      </button>
                                    )}
                                    {inst.status === InstallmentStatus.PAID && (
                                      <>
                                        <button type="button" className="btn-ghost btn-sm" title="Imprimir recibo" onClick={() => printReceipt(plan, inst)}>
                                          <Printer size={13} />
                                        </button>
                                        <button
                                          type="button"
                                          className="btn-ghost btn-sm text-teal-600"
                                          title="Enviar recibo"
                                          disabled={!patient.email || receiptMut.isPending}
                                          onClick={() => receiptMut.mutate({ planId: plan.id, installmentId: inst.id })}
                                        >
                                          <Mail size={13} />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showNew && (
        <NewPlanModal
          catalog={catalog as any[]}
          onClose={() => setShowNew(false)}
          onSubmit={(data) => createMut.mutate(data)}
          loading={createMut.isPending}
        />
      )}

      {payTarget && (
        <PayInstallmentModal
          plan={payTarget.plan}
          installment={payTarget.installment}
          patient={patient}
          onClose={() => setPayTarget(null)}
          onSubmit={(data) =>
            payMut.mutate({
              planId: payTarget.plan.id,
              installmentId: payTarget.installment.id,
              data,
            })
          }
          loading={payMut.isPending}
        />
      )}
    </div>
  );
}

function NewPlanModal({
  catalog,
  onClose,
  onSubmit,
  loading,
}: {
  catalog: any[];
  onClose: () => void;
  onSubmit: (data: any) => void;
  loading: boolean;
}) {
  const [catalogId, setCatalogId] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [totalPrice, setTotalPrice] = useState(0);
  const [downPayment, setDownPayment] = useState(0);
  const [installmentCount, setInstallmentCount] = useState(1);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [toothNumber, setToothNumber] = useState('');

  function handleCatalogChange(id: string) {
    setCatalogId(id);
    const item = catalog.find((c) => c.id === id);
    if (item) {
      setTitle(item.name);
      setCategory(item.category);
      setTotalPrice(Number(item.defaultPrice));
      setInstallmentCount(Number(item.suggestedInstallments));
    }
  }

  const monthlyAmount = installmentCount > 0
    ? Math.round(((totalPrice - downPayment) / installmentCount) * 100) / 100
    : 0;

  return (
    <Modal open onClose={onClose} maxWidth="max-w-lg">
      <div className="p-5 space-y-4">
        <h2 className="section-heading">Nuevo plan de tratamiento</h2>
        <div>
          <label className="label">Tratamiento del catálogo</label>
          <select className="input" value={catalogId} onChange={(e) => handleCatalogChange(e.target.value)}>
            <option value="">Personalizado…</option>
            {catalog.map((c) => (
              <option key={c.id} value={c.id}>{c.category} — {c.name} ({fmt(c.defaultPrice)})</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Nombre</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <label className="label">Categoría</label>
            <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Precio total</label>
            <input className="input" type="number" min={0} value={totalPrice} onChange={(e) => setTotalPrice(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Anticipo</label>
            <input className="input" type="number" min={0} value={downPayment} onChange={(e) => setDownPayment(Number(e.target.value))} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Cant. cuotas</label>
            <input className="input" type="number" min={1} value={installmentCount} onChange={(e) => setInstallmentCount(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Inicio</label>
            <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Pieza (opc.)</label>
            <input className="input" type="number" min={11} max={48} value={toothNumber} onChange={(e) => setToothNumber(e.target.value)} placeholder="FDI" />
          </div>
        </div>
        {installmentCount > 1 && (
          <p className="text-sm text-teal-800 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
            {downPayment > 0 && <>Anticipo {fmt(downPayment)} + </>}
            {installmentCount} cuotas de ~{fmt(monthlyAmount)}/mes
          </p>
        )}
        <div>
          <label className="label">Notas</label>
          <textarea className="input min-h-[60px]" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button
            type="button"
            className="btn-primary"
            disabled={loading || !title || !category || totalPrice <= 0}
            onClick={() => onSubmit({
              catalogItemId: catalogId || undefined,
              title,
              category,
              totalPrice,
              downPayment,
              installmentCount,
              startDate,
              notes: notes || undefined,
              toothNumber: toothNumber ? Number(toothNumber) : undefined,
            })}
          >
            {loading ? 'Creando…' : 'Crear plan'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function PayInstallmentModal({
  plan,
  installment,
  patient,
  onClose,
  onSubmit,
  loading,
}: {
  plan: any;
  installment: any;
  patient: any;
  onClose: () => void;
  onSubmit: (data: any) => void;
  loading: boolean;
}) {
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [sendReceipt, setSendReceipt] = useState(!!patient.email && patient.acceptsEmail !== false);
  const [notes, setNotes] = useState('');

  return (
    <Modal open onClose={onClose} maxWidth="max-w-md">
      <div className="p-5 space-y-4">
        <h2 className="section-heading">Cobrar — {installment.label}</h2>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm">
          <p className="font-medium text-slate-900">{plan.title}</p>
          <p className="text-2xl font-bold text-teal-700 mt-1">{fmt(installment.amount)}</p>
          <p className="meta-label mt-1">
            Vence {new Date(installment.dueDate + 'T12:00:00').toLocaleDateString('es-AR')}
          </p>
        </div>
        <div>
          <label className="label">Método de pago</label>
          <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        {patient.email && (
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" checked={sendReceipt} onChange={(e) => setSendReceipt(e.target.checked)} />
            Enviar recibo a {patient.email}
          </label>
        )}
        <div>
          <label className="label">Notas (opc.)</label>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button
            type="button"
            className="btn-primary"
            disabled={loading}
            onClick={() => onSubmit({
              amount: Number(installment.amount),
              paymentMethod,
              sendReceipt,
              notes: notes || undefined,
            })}
          >
            {loading ? 'Registrando…' : 'Confirmar pago'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/** Modal reutilizable: convertir presupuesto → plan */
export function ConvertBudgetToPlanModal({
  patientId,
  budget,
  onClose,
  onSuccess,
}: {
  patientId: string;
  budget: any;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const qc = useQueryClient();
  const [installmentCount, setInstallmentCount] = useState(1);
  const [downPayment, setDownPayment] = useState(0);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  const createMut = useMutation({
    mutationFn: () => treatmentPlansApi.fromBudget(patientId, budget.id, {
      installmentCount,
      downPayment,
      startDate,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['treatment-plans', patientId] });
      onSuccess?.();
      onClose();
      alert('Plan de tratamiento creado desde el presupuesto');
    },
    onError: (err: any) => alert(err.response?.data?.message ?? 'Error'),
  });

  const monthly = installmentCount > 0
    ? Math.round(((Number(budget.total) - downPayment) / installmentCount) * 100) / 100
    : 0;

  return (
    <Modal open onClose={onClose} maxWidth="max-w-md">
      <div className="p-5 space-y-4">
        <h2 className="section-heading">Convertir presupuesto a plan</h2>
        <p className="text-sm text-slate-600">
          Total del presupuesto: <strong>{fmt(budget.total)}</strong>
        </p>
        <div>
          <label className="label">Cantidad de cuotas</label>
          <input className="input" type="number" min={1} value={installmentCount} onChange={(e) => setInstallmentCount(Number(e.target.value))} />
        </div>
        <div>
          <label className="label">Anticipo</label>
          <input className="input" type="number" min={0} value={downPayment} onChange={(e) => setDownPayment(Number(e.target.value))} />
        </div>
        <div>
          <label className="label">Fecha de inicio</label>
          <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        {installmentCount > 1 && (
          <p className="text-sm text-teal-800 bg-teal-50 px-3 py-2 rounded-lg">
            ~{fmt(monthly)}/mes × {installmentCount} cuotas
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn-primary" disabled={createMut.isPending} onClick={() => createMut.mutate()}>
            Crear plan
          </button>
        </div>
      </div>
    </Modal>
  );
}
