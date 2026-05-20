import { X } from 'lucide-react';
import { ToothSurface, Odontogram } from '@dentaflow/shared';
import { ToothTreatmentForm } from './ToothTreatmentForm';
import { SURFACE_LABELS, SURFACE_SHORT } from './odontogram.constants';
import type { ToothSelection } from './OdontogramView';

interface Props {
  patientId: string;
  odontogram: Odontogram;
  selection: ToothSelection;
  onSurfaceChange: (surface: ToothSurface | null) => void;
  onClose: () => void;
}

export function ToothTreatmentPanel({
  patientId,
  odontogram,
  selection,
  onSurfaceChange,
  onClose,
}: Props) {
  const { toothNumber, surface } = selection;

  return (
    <div className="card p-4 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-800">
            Diente {toothNumber}
            {surface ? (
              <span className="text-teal-600">
                {' '}
                · Cara {SURFACE_SHORT[surface]} ({SURFACE_LABELS[surface]})
              </span>
            ) : (
              <span className="text-slate-500 font-normal text-sm"> · Todo el diente</span>
            )}
          </h3>
        </div>
        <button type="button" className="btn-ghost btn-sm p-1" onClick={onClose} aria-label="Cerrar">
          <X size={16} />
        </button>
      </div>

      <ToothTreatmentForm
        patientId={patientId}
        toothNumber={toothNumber}
        odontogram={odontogram}
        selectedSurface={surface}
        onSurfaceChange={onSurfaceChange}
      />
    </div>
  );
}
