import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, ClipboardList, Box, Layers } from 'lucide-react';
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
import { SketchfabDundeeViewer } from './SketchfabDundeeViewer';
import { SURFACE_LABELS, SURFACE_SHORT } from './odontogram.constants';
import { cn } from '@/lib/utils';

interface Props {
  toothNumber: number;
  patientId: string;
  odontogram: Odontogram;
  selectedSurface: ToothSurface | null;
  onSurfaceChange: (surface: ToothSurface | null) => void;
  onClose?: () => void;
}

type ViewerTab = 'dundee' | 'faces';

export function Tooth3DPanel({
  toothNumber,
  patientId,
  odontogram,
  selectedSurface,
  onSurfaceChange,
  onClose,
}: Props) {
  const [viewerTab, setViewerTab] = useState<ViewerTab>('dundee');
  const [hoveredSurface, setHoveredSurface] = useState<ToothSurface | null>(null);
  const record = odontogram[toothNumber];

  const { data: interventions, isLoading: loadingInterventions } = useQuery({
    queryKey: ['tooth-history', patientId, toothNumber],
    queryFn: () =>
      odontogramApi.toothHistory(patientId, toothNumber).then((r) => r.data),
  });

  return (
    <div className="flex flex-col">
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="min-w-0">
          <span className="nav-section-label text-slate-500">Referencia 3D</span>
          <div className="flex items-baseline gap-2 mt-1 flex-wrap">
            <span className="section-heading">Diente {toothNumber}</span>
            {selectedSurface && (
              <span className="text-sm font-medium text-teal-800">
                · Cara {SURFACE_SHORT[selectedSurface]}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {record?.generalStatus && record.generalStatus !== ToothStatus.HEALTHY && (
            <span
              className="badge text-micro"
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

      <div className="inline-flex border border-slate-300 rounded-lg overflow-hidden mb-3">
        <button
          type="button"
          onClick={() => setViewerTab('dundee')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors',
            viewerTab === 'dundee' ? 'bg-teal-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50',
          )}
        >
          <Box size={14} /> Morphología Dundee
        </button>
        <button
          type="button"
          onClick={() => setViewerTab('faces')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-l border-slate-300',
            viewerTab === 'faces' ? 'bg-teal-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50',
          )}
        >
          <Layers size={14} /> Caras (clínico)
        </button>
      </div>

      {viewerTab === 'dundee' ? (
        <SketchfabDundeeViewer toothNumber={toothNumber} />
      ) : (
        <>
          <InteractiveTooth3D
            toothNumber={toothNumber}
            record={record}
            hoveredSurface={hoveredSurface}
            selectedSurface={selectedSurface}
            onSurfaceClick={onSurfaceChange}
            onSurfaceHover={setHoveredSurface}
          />
          <p className="text-sm text-slate-500 text-center mt-2 mb-1">
            Clic en una cara para registrar en el odontograma.
          </p>
        </>
      )}

      <div className="border-t border-slate-300 pt-3 mt-4">
        <div className="flex items-center gap-2 mb-2">
          <ClipboardList size={14} className="text-teal-800" />
          <span className="font-medium text-sm text-slate-800">Historial del diente</span>
        </div>
        <div className="divide-y divide-slate-200 overflow-y-auto max-h-48 border border-slate-300 rounded-lg bg-slate-50">
          {loadingInterventions ? (
            <div className="p-6 flex justify-center">
              <div className="w-6 h-6 border-2 border-teal-800 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !interventions || interventions.length === 0 ? (
            <div className="empty-state py-6">
              <p className="empty-state-text">Sin intervenciones registradas en este diente.</p>
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
                <div key={rec.id} className="px-3 py-2 hover:bg-white transition-colors">
                  <div className="flex items-start gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full mt-0.5 shrink-0"
                      style={{ backgroundColor: TOOTH_STATUS_COLORS[rec.status] }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">
                        {TOOTH_STATUS_LABELS[rec.status]}
                        {rec.surface && (
                          <span className="text-slate-500 font-normal">
                            {' '}
                            · {SURFACE_LABELS[rec.surface as ToothSurface] ?? `Cara ${rec.surface}`}
                          </span>
                        )}
                      </p>
                      {rec.material && (
                        <p className="text-xs text-slate-500 mt-0.5">Material: {rec.material}</p>
                      )}
                      {rec.notes && (
                        <p className="text-xs text-slate-500 mt-0.5 italic">{rec.notes}</p>
                      )}
                      <div className="flex items-center justify-between mt-1 gap-2">
                        <p className="text-xs text-slate-400">
                          Dr. {rec.performedBy?.lastName ?? '—'}
                        </p>
                        <p className="text-xs text-slate-400 shrink-0">
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
