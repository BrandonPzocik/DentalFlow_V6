import {
  ToothStatus, ToothSurface,
  TOOTH_STATUS_COLORS, TOOTH_STATUS_LABELS,
  Odontogram, ToothRecord,
  UPPER_RIGHT, UPPER_LEFT, LOWER_LEFT, LOWER_RIGHT,
} from '@dentaflow/shared';
import { cn } from '@/lib/utils';

export interface ToothSelection {
  toothNumber: number;
  surface: ToothSurface | null;
}

interface OdontogramProps {
  odontogram: Odontogram;
  selection: ToothSelection | null;
  onSelect: (selection: ToothSelection | null) => void;
}

function getSurfacePath(surface: ToothSurface, cx: number, cy: number, r = 13): string {
  const s = r * 0.42;
  switch (surface) {
    case ToothSurface.OCCLUSAL:  return `M${cx-s},${cy-s} L${cx+s},${cy-s} L${cx+s},${cy+s} L${cx-s},${cy+s}Z`;
    case ToothSurface.VESTIBULAR:return `M${cx-r},${cy-r} L${cx+r},${cy-r} L${cx+s},${cy-s} L${cx-s},${cy-s}Z`;
    case ToothSurface.PALATAL:   return `M${cx-r},${cy+r} L${cx+r},${cy+r} L${cx+s},${cy+s} L${cx-s},${cy+s}Z`;
    case ToothSurface.MESIAL:    return `M${cx-r},${cy-r} L${cx-s},${cy-s} L${cx-s},${cy+s} L${cx-r},${cy+r}Z`;
    case ToothSurface.DISTAL:    return `M${cx+r},${cy-r} L${cx+s},${cy-s} L${cx+s},${cy+s} L${cx+r},${cy+r}Z`;
    default: return '';
  }
}

const ALL_SURFACES = [
  ToothSurface.VESTIBULAR,
  ToothSurface.MESIAL,
  ToothSurface.OCCLUSAL,
  ToothSurface.DISTAL,
  ToothSurface.PALATAL,
];

function ToothCell({
  number, record, isSelected, selectedSurface, onSelect, onSurfaceSelect, isFlipped,
}: {
  number: number;
  record?: ToothRecord;
  isSelected: boolean;
  selectedSurface: ToothSurface | null;
  onSelect: () => void;
  onSurfaceSelect: (surface: ToothSurface) => void;
  isFlipped: boolean;
}) {
  const cx = 17, cy = 17, r = 13;
  const isAbsent = record?.generalStatus === ToothStatus.ABSENT;

  return (
    <div className="flex flex-col items-center gap-0.5">
      {!isFlipped && (
        <span className="text-[9px] font-mono text-slate-400 leading-none">{number}</span>
      )}

      <div
        className={cn(
          'relative cursor-pointer transition-transform hover:scale-110',
          isSelected && 'scale-110',
        )}
        onClick={onSelect}
      >
        <svg width="34" height="34" viewBox="0 0 34 34">
          {isSelected && (
            <circle cx={cx} cy={cy} r={r + 1} fill="none" stroke="#0d9488" strokeWidth="1.5" />
          )}

          <rect
            x={cx - r} y={cy - r} width={r * 2} height={r * 2}
            rx="3"
            fill={isAbsent ? '#f1f5f9' : '#fff'}
            stroke={isSelected ? '#0d9488' : '#cbd5e1'}
            strokeWidth={isSelected ? 1.5 : 0.8}
          />

          {isAbsent && (
            <>
              <line x1={cx-6} y1={cy-6} x2={cx+6} y2={cy+6} stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
              <line x1={cx+6} y1={cy-6} x2={cx-6} y2={cy+6} stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
            </>
          )}

          {!isAbsent && ALL_SURFACES.map((surface) => {
            const surfaceRecord = record?.surfaces[surface];
            const color = surfaceRecord
              ? TOOTH_STATUS_COLORS[surfaceRecord.status]
              : 'transparent';
            const faceSelected = isSelected && selectedSurface === surface;
            return (
              <path
                key={surface}
                d={getSurfacePath(surface, cx, cy, r)}
                fill={color}
                fillOpacity={color === 'transparent' ? 0 : 0.85}
                stroke={faceSelected ? '#0d9488' : '#e2e8f0'}
                strokeWidth={faceSelected ? 1.2 : 0.4}
                className="hover:opacity-70 cursor-pointer transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onSurfaceSelect(surface);
                }}
              />
            );
          })}

          {record?.generalStatus && record.generalStatus !== ToothStatus.HEALTHY && !isAbsent && (
            <circle
              cx={cx} cy={cy} r={4}
              fill={TOOTH_STATUS_COLORS[record.generalStatus]}
              stroke="white" strokeWidth="0.8"
            />
          )}
        </svg>
      </div>

      {isFlipped && (
        <span className="text-[9px] font-mono text-slate-400 leading-none">{number}</span>
      )}
    </div>
  );
}

function Legend() {
  const items = [
    ToothStatus.FILLING,
    ToothStatus.CROWN,
    ToothStatus.CAVITY,
    ToothStatus.ROOT_CANAL,
    ToothStatus.ABSENT,
    ToothStatus.IMPLANT,
    ToothStatus.EXTRACTION,
    ToothStatus.SEALANT,
  ];
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
      {items.map((s) => (
        <div key={s} className="flex items-center gap-1.5">
          <span className="w-3 h-3 shrink-0" style={{ backgroundColor: TOOTH_STATUS_COLORS[s] }} />
          <span className="text-xs text-slate-500">{TOOTH_STATUS_LABELS[s]}</span>
        </div>
      ))}
    </div>
  );
}

function TeethRow({
  teeth, odontogram, selection, isFlipped, onSelect, onSurfaceSelect,
}: {
  teeth: number[];
  odontogram: Odontogram;
  selection: ToothSelection | null;
  isFlipped: boolean;
  onSelect: (n: number) => void;
  onSurfaceSelect: (n: number, s: ToothSurface) => void;
}) {
  return (
    <div className="flex gap-1">
      {teeth.map((num) => (
        <ToothCell
          key={num}
          number={num}
          record={odontogram[num]}
          isSelected={selection?.toothNumber === num}
          selectedSurface={selection?.toothNumber === num ? selection.surface : null}
          isFlipped={isFlipped}
          onSelect={() => onSelect(num)}
          onSurfaceSelect={(s) => onSurfaceSelect(num, s)}
        />
      ))}
    </div>
  );
}

export function OdontogramView({ odontogram, selection, onSelect }: OdontogramProps) {
  function handleToothSelect(n: number) {
    if (selection?.toothNumber === n && selection.surface === null) {
      onSelect(null);
      return;
    }
    onSelect({ toothNumber: n, surface: null });
  }

  function handleSurfaceSelect(n: number, surface: ToothSurface) {
    onSelect({ toothNumber: n, surface });
  }

  return (
    <div className="panel p-5 overflow-x-auto">
      <p className="text-xs text-slate-500 mb-3">
        Clic en un diente o en una cara. El formulario de prestación aparece debajo.
      </p>
      <div className="min-w-[600px]">
        <div className="flex justify-center gap-1 mb-1">
          <div className="flex gap-1 border-r border-slate-200 pr-1">
            <TeethRow
              teeth={UPPER_RIGHT}
              odontogram={odontogram}
              selection={selection}
              isFlipped={false}
              onSelect={handleToothSelect}
              onSurfaceSelect={handleSurfaceSelect}
            />
          </div>
          <div className="flex gap-1 pl-1">
            <TeethRow
              teeth={UPPER_LEFT}
              odontogram={odontogram}
              selection={selection}
              isFlipped={false}
              onSelect={handleToothSelect}
              onSurfaceSelect={handleSurfaceSelect}
            />
          </div>
        </div>

        <div className="relative my-2">
          <div className="absolute inset-x-0 top-1/2 border-t-2 border-dashed border-slate-200" />
          <div className="relative flex justify-center">
            <span className="bg-white px-2 text-[9px] text-slate-400 font-mono uppercase tracking-widest">
              Arco superior ↑ ↓ Arco inferior
            </span>
          </div>
        </div>

        <div className="flex justify-center gap-1 mt-1">
          <div className="flex gap-1 border-r border-slate-200 pr-1">
            <TeethRow
              teeth={LOWER_LEFT}
              odontogram={odontogram}
              selection={selection}
              isFlipped={true}
              onSelect={handleToothSelect}
              onSurfaceSelect={handleSurfaceSelect}
            />
          </div>
          <div className="flex gap-1 pl-1">
            <TeethRow
              teeth={LOWER_RIGHT}
              odontogram={odontogram}
              selection={selection}
              isFlipped={true}
              onSelect={handleToothSelect}
              onSurfaceSelect={handleSurfaceSelect}
            />
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-xs font-medium text-slate-500 mb-2">Referencia de colores</p>
          <Legend />
        </div>
      </div>
    </div>
  );
}
