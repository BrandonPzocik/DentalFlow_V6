import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import {
  ToothStatus,
  ToothSurface,
  TOOTH_STATUS_COLORS,
  TOOTH_STATUS_LABELS,
  Odontogram,
} from '@dentaflow/shared';
import { odontogramApi, treatmentPlansApi } from '@/api';
import { cn } from '@/lib/utils';
import { ALL_SURFACES_ORDER, SURFACE_LABELS, SURFACE_SHORT } from './odontogram.constants';

interface Props {
  patientId: string;
  toothNumber: number;
  odontogram: Odontogram;
  selectedSurface: ToothSurface | null;
  onSurfaceChange: (surface: ToothSurface | null) => void;
  onSaved?: () => void;
}

export function ToothTreatmentForm({
  patientId,
  toothNumber,
  odontogram,
  selectedSurface,
  onSurfaceChange,
  onSaved,
}: Props) {
  const qc = useQueryClient();
  const record = odontogram[toothNumber];
  const [status, setStatus] = useState<ToothStatus>(ToothStatus.FILLING);
  const [material, setMaterial] = useState('');
  const [notes, setNotes] = useState('');
  const [justSaved, setJustSaved] = useState(false);
  const [createPlan, setCreatePlan] = useState(false);
  const [planPrice, setPlanPrice] = useState(0);
  const [planInstallments, setPlanInstallments] = useState(1);

  const currentStatus = selectedSurface
    ? record?.surfaces[selectedSurface]?.status
    : record?.generalStatus;

  useEffect(() => {
    if (currentStatus && currentStatus !== ToothStatus.HEALTHY) {
      setStatus(currentStatus);
    } else {
      setStatus(selectedSurface ? ToothStatus.CAVITY : ToothStatus.FILLING);
    }
    setMaterial('');
    setNotes('');
    setJustSaved(false);
  }, [toothNumber, selectedSurface]);

  const mutation = useMutation({
    mutationFn: async (data: {
      toothNumber: number;
      surface?: ToothSurface;
      status: ToothStatus;
      material?: string;
      notes?: string;
    }) => {
      await odontogramApi.registerTreatment(patientId, data);
      if (createPlan && planPrice > 0) {
        await treatmentPlansApi.fromOdontogram(patientId, {
          title: `${TOOTH_STATUS_LABELS[data.status]} — pieza ${data.toothNumber}`,
          category: 'Odontograma',
          totalPrice: planPrice,
          installmentCount: planInstallments,
          startDate: new Date().toISOString().split('T')[0],
          toothNumber: data.toothNumber,
          notes: data.notes,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['odontogram', patientId] });
      qc.invalidateQueries({ queryKey: ['tooth-history', patientId, toothNumber] });
      qc.invalidateQueries({ queryKey: ['treatment-plans', patientId] });
      setMaterial('');
      setNotes('');
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
      onSaved?.();
    },
  });

  function handleSave() {
    mutation.mutate({
      toothNumber,
      surface: selectedSurface ?? undefined,
      status,
      material: material || undefined,
      notes: notes || undefined,
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="nav-section-label mb-1.5">
          ¿Dónde registrar?
        </p>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => onSurfaceChange(null)}
            className={cn(
              'px-2.5 py-1.5 text-xs font-medium border transition-all',
              selectedSurface === null
                ? 'border-teal-500 bg-teal-50 text-teal-800'
                : 'border-slate-200 text-slate-600 hover:border-slate-300',
            )}
          >
            Todo el diente
          </button>
          {ALL_SURFACES_ORDER.map((s) => {
            const hasTreatment = !!record?.surfaces[s];
            return (
              <button
                key={s}
                type="button"
                onClick={() => onSurfaceChange(s)}
                className={cn(
                  'px-2.5 py-1.5 text-xs font-medium border transition-all min-w-[2rem]',
                  selectedSurface === s
                    ? 'border-teal-500 bg-teal-50 text-teal-800'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300',
                  hasTreatment && selectedSurface !== s && 'ring-1 ring-inset ring-slate-300',
                )}
                title={SURFACE_LABELS[s]}
              >
                {SURFACE_SHORT[s]}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-500 mt-1.5">
          {selectedSurface
            ? `Cara ${SURFACE_LABELS[selectedSurface]}`
            : 'Prestación que aplica a todo el diente (corona, ausente, implante…)'}
          {currentStatus && currentStatus !== ToothStatus.HEALTHY && (
            <span className="text-slate-400">
              {' '}
              · Actual: {TOOTH_STATUS_LABELS[currentStatus]}
            </span>
          )}
        </p>
      </div>

      <div>
        <label className="label">Prestación</label>
        <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-0.5">
          {Object.values(ToothStatus).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 text-xs font-medium border transition-all text-left',
                status === s
                  ? 'border-teal-500 bg-teal-50 text-teal-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
              )}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: TOOTH_STATUS_COLORS[s] }}
              />
              <span className="truncate">{TOOTH_STATUS_LABELS[s]}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Material (opcional)</label>
        <input
          className="input text-sm"
          value={material}
          onChange={(e) => setMaterial(e.target.value)}
          placeholder="Resina, amalgama, zirconio…"
        />
      </div>

      <div>
        <label className="label">Notas clínicas</label>
        <textarea
          className="input text-sm resize-none h-14"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Clase II, profundidad, observaciones…"
        />
      </div>

      <div className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50/50">
        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input type="checkbox" checked={createPlan} onChange={(e) => setCreatePlan(e.target.checked)} />
          Crear plan de cobro con cuotas
        </label>
        {createPlan && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label text-xs">Precio total</label>
              <input className="input text-sm" type="number" min={0} value={planPrice} onChange={(e) => setPlanPrice(Number(e.target.value))} />
            </div>
            <div>
              <label className="label text-xs">Cuotas</label>
              <input className="input text-sm" type="number" min={1} value={planInstallments} onChange={(e) => setPlanInstallments(Number(e.target.value))} />
            </div>
          </div>
        )}
      </div>

      {mutation.isError && (
        <p className="text-xs text-red-500">No se pudo guardar. Intentá de nuevo.</p>
      )}

      <button
        type="button"
        className="btn-primary w-full"
        onClick={handleSave}
        disabled={mutation.isPending}
      >
        <Save size={14} />
        {mutation.isPending ? 'Guardando…' : justSaved ? '¡Guardado!' : 'Registrar prestación'}
      </button>
    </div>
  );
}
