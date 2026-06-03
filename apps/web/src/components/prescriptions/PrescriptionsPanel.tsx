import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Trash2, FileText, Printer, CheckCircle,
  Pill, DollarSign, X, Save, Mail,
} from 'lucide-react';
import { prescriptionsApi, settingsApi, notificationsApi } from '@/api';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';
import {
  buildPrescriptionDocumentHtml,
  wrapForPrint,
} from '@/lib/clinicalDocuments';

const COMMON_DRUGS = [
  'Amoxicilina 500mg', 'Ibuprofeno 400mg', 'Paracetamol 500mg',
  'Metronidazol 500mg', 'Clindamicina 300mg', 'Diclofenac 50mg',
  'Dexametasona 4mg', 'Ketorolac 10mg', 'Tramadol 50mg',
];

const FREQUENCIES = ['Cada 8hs', 'Cada 12hs', 'Cada 6hs', 'Una vez al día', 'Antes de dormir', 'Con las comidas'];
const DURATIONS   = ['3 días', '5 días', '7 días', '10 días', 'Hasta terminar'];

// ── Main PrescriptionsPanel ───────────────────────────────────────────────────
export function PrescriptionsPanel({ patientId, patient }: { patientId: string; patient: any }) {
  const qc = useQueryClient();
  const user = useAuthStore(s => s.user);
  const [activeTab, setActiveTab] = useState<'list' | 'recipe' | 'budget'>('list');

  // Recipe state
  const [recipeItems, setRecipeItems] = useState([
    { drug: '', dose: '', frequency: 'Cada 8hs', duration: '5 días', notes: '' },
  ]);
  const [diagnosis, setDiagnosis] = useState('');
  const [recipeNotes, setRecipeNotes] = useState('');

  // Budget state
  const [budgetItems, setBudgetItems] = useState([
    { description: '', toothNumber: '', quantity: 1, unitPrice: 0 },
  ]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [validUntil, setValidUntil] = useState('');
  const [budgetNotes, setBudgetNotes] = useState('');

  const { data: clinicSettings = {} } = useQuery({
    queryKey: ['settings-flat'],
    queryFn: () => settingsApi.getAll().then(r => r.data),
  });

  const { data: prescriptions = [], isLoading } = useQuery({
    queryKey: ['prescriptions', patientId],
    queryFn: () => prescriptionsApi.list(patientId).then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => prescriptionsApi.create(patientId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prescriptions', patientId] });
      setActiveTab('list');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => prescriptionsApi.remove(patientId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prescriptions', patientId] }),
  });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => prescriptionsApi.accept(patientId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prescriptions', patientId] }),
  });

  const emailMutation = useMutation({
    mutationFn: (payload: { subject: string; html: string; type: string }) =>
      notificationsApi.sendDocument({
        patientId,
        subject: payload.subject,
        html: payload.html,
        type: payload.type,
      }).then((r) => r.data),
  });

  // Budget computed values
  const subtotal = budgetItems.reduce((s, i) => s + Number(i.unitPrice) * Number(i.quantity), 0);
  const total = subtotal * (1 - discountPercent / 100);

  function addRecipeItem() {
    setRecipeItems(i => [...i, { drug: '', dose: '', frequency: 'Cada 8hs', duration: '5 días', notes: '' }]);
  }

  function addBudgetItem() {
    setBudgetItems(i => [...i, { description: '', toothNumber: '', quantity: 1, unitPrice: 0 }]);
  }

  function saveRecipe() {
    createMutation.mutate({
      type: 'recipe',
      items: recipeItems.filter(i => i.drug),
      diagnosis,
      notes: recipeNotes,
    });
  }

  function saveBudget() {
    const items = budgetItems
      .filter(i => i.description)
      .map(i => ({
        description: i.description,
        toothNumber: i.toothNumber ? Number(i.toothNumber) : undefined,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        total: Number(i.quantity) * Number(i.unitPrice),
      }));
    createMutation.mutate({
      type: 'budget',
      items,
      subtotal,
      discountPercent,
      total,
      validUntil: validUntil || undefined,
      notes: budgetNotes,
    });
  }

  function documentHtml(p: any) {
    return buildPrescriptionDocumentHtml(p, patient, clinicSettings as Record<string, string>);
  }

  function printPrescription(p: any) {
    const win = window.open('', '_blank', 'width=860,height=720');
    if (!win) return;
    win.document.write(wrapForPrint(documentHtml(p)));
    win.document.close();
  }

  async function emailPrescription(p: any) {
    if (!patient.email) {
      alert('El paciente no tiene email registrado.');
      return;
    }
    if (patient.acceptsEmail === false) {
      alert('El paciente no acepta comunicaciones por email.');
      return;
    }
    const subject =
      p.type === 'recipe'
        ? `Receta médica — ${patient.lastName}, ${patient.firstName}`
        : `Presupuesto — ${patient.lastName}, ${patient.firstName}`;
    try {
      const res = await emailMutation.mutateAsync({
        subject,
        html: documentHtml(p),
        type: p.type === 'recipe' ? 'prescription' : 'budget',
      });
      alert(res.simulated ? `${res.message}` : res.message);
    } catch (err: any) {
      alert(err.response?.data?.message ?? err.message ?? 'No se pudo enviar el email');
    }
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex items-center justify-between">
        <h3 className="section-heading">Recetario y Presupuestos</h3>
        <div className="flex gap-1 bg-slate-100 p-1 border border-slate-200">
          {([
            { key: 'list',   label: 'Historial',   icon: FileText },
            { key: 'recipe', label: 'Nueva receta', icon: Pill },
            { key: 'budget', label: 'Presupuesto',  icon: DollarSign },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all',
                activeTab === key
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700',
              )}
            >
              <Icon size={13} />{label}
            </button>
          ))}
        </div>
      </div>

      {/* ── LIST ── */}
      {activeTab === 'list' && (
        <div className="space-y-3">
          {isLoading ? (
            <div className="panel p-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (prescriptions as any[]).length === 0 ? (
            <div className="panel p-10 text-center">
              <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Sin recetas ni presupuestos aún</p>
            </div>
          ) : (prescriptions as any[]).map((p: any) => (
            <div key={p.id} className="panel p-4 flex items-start gap-4">
              <div className={cn(
                'w-10 h-10 flex items-center justify-center flex-shrink-0',
                p.type === 'recipe' ? 'bg-blue-100' : 'bg-emerald-100',
              )}>
                {p.type === 'recipe'
                  ? <Pill size={18} className="text-blue-600" />
                  : <DollarSign size={18} className="text-emerald-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-slate-800">
                    {p.type === 'recipe' ? 'Receta médica' : 'Presupuesto'}
                  </span>
                  {p.type === 'budget' && p.accepted && (
                    <span className="badge bg-emerald-100 text-emerald-700 text-xs">
                      <CheckCircle size={10} className="mr-1" />Aceptado
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  {new Date(p.createdAt).toLocaleDateString('es-AR')}
                  {p.type === 'recipe' && p.items?.length
                    ? ` · ${p.items.length} medicamento${p.items.length !== 1 ? 's' : ''}`
                    : ''}
                  {p.type === 'budget' && p.total
                    ? ` · Total: ${fmt(p.total)}`
                    : ''}
                </p>
                {p.diagnosis && <p className="text-xs text-slate-400 italic">{p.diagnosis}</p>}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {p.type === 'budget' && !p.accepted && (
                  <button
                    className="btn-ghost btn-sm text-emerald-600 hover:bg-emerald-50"
                    title="Marcar como aceptado"
                    onClick={() => acceptMutation.mutate(p.id)}
                  >
                    <CheckCircle size={14} />
                  </button>
                )}
                <button
                  className="btn-ghost btn-sm text-teal-600"
                  title="Enviar por email"
                  disabled={emailMutation.isPending || !patient.email}
                  onClick={() => emailPrescription(p)}
                >
                  <Mail size={14} />
                </button>
                <button
                  className="btn-ghost btn-sm text-slate-600"
                  title="Imprimir / PDF"
                  onClick={() => printPrescription(p)}
                >
                  <Printer size={14} />
                </button>
                <button
                  className="btn-ghost btn-sm text-red-400 hover:bg-red-50"
                  title="Eliminar"
                  onClick={() => { if (confirm('¿Eliminar?')) deleteMutation.mutate(p.id); }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── RECIPE FORM ── */}
      {activeTab === 'recipe' && (
        <div className="space-y-4">
          <div>
            <label className="label">Diagnóstico / Motivo</label>
            <input className="input" value={diagnosis} onChange={e => setDiagnosis(e.target.value)}
              placeholder="Dolor post-extracción, infección periapical…" />
          </div>

          {recipeItems.map((item, i) => (
            <div key={i} className="panel p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="nav-section-label">
                  Medicamento {i + 1}
                </span>
                {i > 0 && (
                  <button
                    onClick={() => setRecipeItems(prev => prev.filter((_, idx) => idx !== i))}
                    className="text-red-400 hover:text-red-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="label">Medicamento</label>
                  <div className="relative">
                    <input className="input" value={item.drug}
                      onChange={e => setRecipeItems(prev => prev.map((it, idx) => idx === i ? { ...it, drug: e.target.value } : it))}
                      placeholder="Amoxicilina 500mg…" list={`drugs-${i}`} />
                    <datalist id={`drugs-${i}`}>
                      {COMMON_DRUGS.map(d => <option key={d} value={d} />)}
                    </datalist>
                  </div>
                </div>
                <div>
                  <label className="label">Dosis</label>
                  <input className="input" value={item.dose}
                    onChange={e => setRecipeItems(prev => prev.map((it, idx) => idx === i ? { ...it, dose: e.target.value } : it))}
                    placeholder="1 comprimido" />
                </div>
                <div>
                  <label className="label">Frecuencia</label>
                  <select className="input" value={item.frequency}
                    onChange={e => setRecipeItems(prev => prev.map((it, idx) => idx === i ? { ...it, frequency: e.target.value } : it))}>
                    {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Duración</label>
                  <select className="input" value={item.duration}
                    onChange={e => setRecipeItems(prev => prev.map((it, idx) => idx === i ? { ...it, duration: e.target.value } : it))}>
                    {DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Notas (opcional)</label>
                  <input className="input" value={item.notes}
                    onChange={e => setRecipeItems(prev => prev.map((it, idx) => idx === i ? { ...it, notes: e.target.value } : it))}
                    placeholder="Con las comidas…" />
                </div>
              </div>
            </div>
          ))}

          <button className="btn-ghost btn-sm text-teal-600" onClick={addRecipeItem}>
            <Plus size={14} /> Agregar medicamento
          </button>

          <div>
            <label className="label">Observaciones</label>
            <textarea className="input resize-none h-16" value={recipeNotes}
              onChange={e => setRecipeNotes(e.target.value)}
              placeholder="Indicaciones adicionales para el paciente…" />
          </div>

          <div className="flex gap-3">
            <button className="btn-secondary flex-1" onClick={() => setActiveTab('list')}>Cancelar</button>
            <button className="btn-primary flex-1" onClick={saveRecipe} disabled={createMutation.isPending}>
              <Save size={14} />
              {createMutation.isPending ? 'Guardando…' : 'Guardar receta'}
            </button>
          </div>
        </div>
      )}

      {/* ── BUDGET FORM ── */}
      {activeTab === 'budget' && (
        <div className="space-y-4">
          {budgetItems.map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end p-3 bg-slate-50 border border-slate-200">
              <div className="col-span-5">
                <label className="label">Prestación</label>
                <input className="input bg-white" value={item.description}
                  onChange={e => setBudgetItems(prev => prev.map((it, idx) => idx === i ? { ...it, description: e.target.value } : it))}
                  placeholder="Obturación resina…" />
              </div>
              <div className="col-span-2">
                <label className="label">Diente</label>
                <input className="input bg-white font-mono" value={item.toothNumber}
                  onChange={e => setBudgetItems(prev => prev.map((it, idx) => idx === i ? { ...it, toothNumber: e.target.value } : it))}
                  placeholder="16" />
              </div>
              <div className="col-span-1">
                <label className="label">Cant.</label>
                <input type="number" className="input bg-white" min={1} value={item.quantity}
                  onChange={e => setBudgetItems(prev => prev.map((it, idx) => idx === i ? { ...it, quantity: +e.target.value } : it))} />
              </div>
              <div className="col-span-3">
                <label className="label">Precio unitario</label>
                <input type="number" className="input bg-white" min={0} value={item.unitPrice}
                  onChange={e => setBudgetItems(prev => prev.map((it, idx) => idx === i ? { ...it, unitPrice: +e.target.value } : it))} />
              </div>
              <div className="col-span-1">
                <button
                  className="btn-ghost btn-sm text-red-400 hover:bg-red-50 p-1.5"
                  onClick={() => setBudgetItems(prev => prev.filter((_, idx) => idx !== i))}
                  disabled={budgetItems.length === 1}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}

          <button className="btn-ghost btn-sm text-teal-600" onClick={addBudgetItem}>
            <Plus size={14} /> Agregar prestación
          </button>

          {/* Totals */}
          <div className="bg-slate-50 border border-slate-200 p-4 space-y-2">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal</span>
              <span>{fmt(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <span>Descuento</span>
                <input type="number" className="input w-16 py-0.5 text-center" min={0} max={100}
                  value={discountPercent} onChange={e => setDiscountPercent(+e.target.value)} />
                <span>%</span>
              </div>
              <span className="text-red-500">
                {discountPercent > 0 ? `- ${fmt(subtotal * discountPercent / 100)}` : '—'}
              </span>
            </div>
            <div className="flex justify-between font-medium text-slate-800 pt-2 border-t border-slate-200">
              <span>TOTAL</span>
              <span className="text-teal-700 text-lg">{fmt(total)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Válido hasta</label>
              <input type="date" className="input" value={validUntil}
                onChange={e => setValidUntil(e.target.value)} />
            </div>
            <div>
              <label className="label">Notas</label>
              <input className="input" value={budgetNotes}
                onChange={e => setBudgetNotes(e.target.value)} placeholder="Observaciones…" />
            </div>
          </div>

          <div className="flex gap-3">
            <button className="btn-secondary flex-1" onClick={() => setActiveTab('list')}>Cancelar</button>
            <button className="btn-primary flex-1" onClick={saveBudget} disabled={createMutation.isPending}>
              <Save size={14} />
              {createMutation.isPending ? 'Guardando…' : 'Guardar presupuesto'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
