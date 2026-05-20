import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, ClipboardList } from 'lucide-react';
import {
  ToothStatus,
  ToothSurface,
  TOOTH_STATUS_COLORS,
  TOOTH_STATUS_LABELS,
  Odontogram,
} from '@dentaflow/shared';
import { odontogramApi } from '@/api';
import { formatDateTime } from '@/lib/utils';
import { InteractiveTooth3D } from './InteractiveTooth3D';
import { SURFACE_LABELS, SURFACE_SHORT } from './odontogram.constants';

interface Props {
  toothNumber: number;
  patientId: string;
  odontogram: Odontogram;
  selectedSurface: ToothSurface | null;
  onSurfaceChange: (surface: ToothSurface | null) => void;
  onClose?: () => void;
}

export function Tooth3DPanel({
  toothNumber,
  patientId,
  odontogram,
  selectedSurface,
  onSurfaceChange,
  onClose,
}: Props) {
  const [hoveredSurface, setHoveredSurface] = useState<ToothSurface | null>(null);
  const record = odontogram[toothNumber];

  const { data: interventions, isLoading: loadingInterventions } = useQuery({
    queryKey: ['tooth-history', patientId, toothNumber],
    queryFn: () =>
      odontogramApi.toothHistory(patientId, toothNumber).then((r) => r.data),
  });

  return (
    <div className="flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Modelo 3D
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-slate-800">Diente {toothNumber}</span>
            {selectedSurface && (
              <span className="text-sm font-semibold text-teal-700">
                · Cara {SURFACE_SHORT[selectedSurface]}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {record?.generalStatus && record.generalStatus !== ToothStatus.HEALTHY && (
            <span
              className="badge text-xs"
              style={{
                backgroundColor: TOOTH_STATUS_COLORS[record.generalStatus] + '22',
                color: TOOTH_STATUS_COLORS[record.generalStatus],
              }}
            >
              {TOOTH_STATUS_LABELS[record.generalStatus]}
            </span>
          )}
          {onClose && (
            <button
              type="button"
              className="btn-ghost btn-sm p-1"
              onClick={onClose}
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <InteractiveTooth3D
        toothNumber={toothNumber}
        record={record}
        hoveredSurface={hoveredSurface}
        selectedSurface={selectedSurface}
        onSurfaceClick={onSurfaceChange}
        onSurfaceHover={setHoveredSurface}
      />

      <p className="text-[11px] text-slate-400 text-center mt-2 mb-3">
        Clic en una cara del modelo · el formulario está debajo del odontograma
      </p>

      <div className="border-t border-slate-100 pt-3">
        <div className="flex items-center gap-2 mb-2">
          <ClipboardList size={14} className="text-teal-600" />
          <span className="font-semibold text-sm text-slate-800">Historial del diente</span>
        </div>
        <div className="divide-y divide-slate-100 overflow-y-auto max-h-52 rounded-lg border border-slate-100 bg-slate-50/50">
          {loadingInterventions ? (
            <div className="p-6 flex justify-center">
              <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !interventions || interventions.length === 0 ? (
            <div className="p-4 text-center text-slate-400 text-xs">
              Sin intervenciones registradas
            </div>
          ) : (
            interventions.map(
              (rec: {
                id: string;
                status: ToothStatus;
                surface?: string;
                material?: string;
                notes?: string;
                performedBy?: { lastName?: string };
                createdAt: string;
              }) => (
                <div key={rec.id} className="px-3 py-2.5 hover:bg-white/80 transition-colors">
                  <div className="flex items-start gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full mt-0.5 shrink-0"
                      style={{ backgroundColor: TOOTH_STATUS_COLORS[rec.status] }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800">
                        {TOOTH_STATUS_LABELS[rec.status]}
                        {rec.surface && (
                          <span className="text-slate-500 font-normal">
                            {' '}
                            · {SURFACE_LABELS[rec.surface as ToothSurface] ?? `Cara ${rec.surface}`}
                          </span>
                        )}
                      </p>
                      {rec.material && (
                        <p className="text-[11px] text-slate-500 mt-0.5">Material: {rec.material}</p>
                      )}
                      {rec.notes && (
                        <p className="text-[11px] text-slate-500 mt-0.5 italic">{rec.notes}</p>
                      )}
                      <div className="flex items-center justify-between mt-1 gap-2">
                        <p className="text-[10px] text-slate-400">
                          Dr. {rec.performedBy?.lastName ?? '—'}
                        </p>
                        <p className="text-[10px] text-slate-400 shrink-0">
                          {formatDateTime(rec.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ),
            )
          )}
        </div>
      </div>
    </div>
  );
}
