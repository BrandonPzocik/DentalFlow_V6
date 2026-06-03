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
  number,
  record,
  isSelected,
  selectedSurface,
  isFlipped,
  onSelect,
  onSurfaceSelect,
}: {
  number: number;
  record?: ToothRecord;
  isSelected: boolean;
  selectedSurface: ToothSurface | null;
  isFlipped: boolean;
  onSelect: () => void;
  onSurfaceSelect: (surface: ToothSurface) => void;
}) {
  const cx = 17, cy = 17, r = 13;
  const isAbsent = record?.generalStatus === ToothStatus.ABSENT;

  return (
    <div className="flex flex-col items-center gap-1 w-9">
      {!isFlipped && (
        <span className="text-xs font-mono font-medium text-slate-600 leading-none">{number}</span>
      )}

      <div
        className={cn(
          'relative cursor-pointer transition-transform hover:scale-105',
          isSelected && 'scale-105',
        )}
        onClick={onSelect}
      >
        <svg width="34" height="34" viewBox="0 0 34 34">
          {isSelected && (
            <rect
              x={cx - r - 1} y={cy - r - 1}
              width={(r + 1) * 2} height={(r + 1) * 2}
              rx={3}
              fill="none" stroke="#0f766e" strokeWidth="1.5"
            />
          )}
          <rect
            x={cx - r} y={cy - r} width={r * 2} height={r * 2}
            rx="2"
            fill={isAbsent ? '#e2e8f0' : '#fff'}
            stroke={isSelected ? '#0f766e' : '#94a3b8'}
            strokeWidth={isSelected ? 1.5 : 1}
          />
          {isAbsent && (
            <>
              <line x1={cx-6} y1={cy-6} x2={cx+6} y2={cy+6} stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
              <line x1={cx+6} y1={cy-6} x2={cx-6} y2={cy+6} stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
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
                fillOpacity={color === 'transparent' ? 0 : 0.88}
                stroke={faceSelected ? '#0f766e' : '#cbd5e1'}
                strokeWidth={faceSelected ? 1.2 : 0.5}
                className="hover:opacity-80 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onSurfaceSelect(surface);
                }}
              />
            );
          })}
          {record?.generalStatus && record.generalStatus !== ToothStatus.HEALTHY && !isAbsent && (
            <circle
              cx={cx} cy={cy} r={3.5}
              fill={TOOTH_STATUS_COLORS[record.generalStatus]}
              stroke="white" strokeWidth="0.8"
            />
          )}
        </svg>
      </div>

      {isFlipped && (
        <span className="text-xs font-mono font-medium text-slate-600 leading-none">{number}</span>
      )}
    </div>
  );
}

function TeethRow({
  teeth,
  odontogram,
  selection,
  isFlipped,
  onSelect,
  onSurfaceSelect,
}: {
  teeth: number[];
  odontogram: Odontogram;
  selection: ToothSelection | null;
  isFlipped: boolean;
  onSelect: (n: number) => void;
  onSurfaceSelect: (n: number, s: ToothSurface) => void;
}) {
  return (
    <div className="flex gap-0.5">
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
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {items.map((s) => (
        <div key={s} className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 shrink-0 border border-slate-300" style={{ backgroundColor: TOOTH_STATUS_COLORS[s] }} />
          <span className="text-sm text-slate-600">{TOOTH_STATUS_LABELS[s]}</span>
        </div>
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
    <div className="odontogram-panel p-5 overflow-x-auto">
      <p className="text-sm text-slate-600 mb-4">
        Clic en un diente o en una cara del cuadrado. El formulario de prestación aparece debajo.
      </p>

      <div className="min-w-[600px] mx-auto">
        {/* Arcada superior */}
        <div className="flex justify-center gap-1 pb-1">
          <div className="flex gap-0.5 border-r-2 border-slate-400 pr-2">
            <TeethRow
              teeth={UPPER_RIGHT}
              odontogram={odontogram}
              selection={selection}
              isFlipped={false}
              onSelect={handleToothSelect}
              onSurfaceSelect={handleSurfaceSelect}
            />
          </div>
          <div className="flex gap-0.5 pl-2">
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

        <div className="relative my-2 py-2">
          <div className="absolute inset-x-8 top-1/2 border-t border-dashed border-slate-400" />
          <p className="relative text-center text-xs text-slate-500 bg-white inline-block px-2 mx-auto w-fit block">
            Línea media
          </p>
        </div>

        {/* Arcada inferior */}
        <div className="flex justify-center gap-1 pt-1">
          <div className="flex gap-0.5 border-r-2 border-slate-400 pr-2">
            <TeethRow
              teeth={LOWER_LEFT}
              odontogram={odontogram}
              selection={selection}
              isFlipped
              onSelect={handleToothSelect}
              onSurfaceSelect={handleSurfaceSelect}
            />
          </div>
          <div className="flex gap-0.5 pl-2">
            <TeethRow
              teeth={LOWER_RIGHT}
              odontogram={odontogram}
              selection={selection}
              isFlipped
              onSelect={handleToothSelect}
              onSurfaceSelect={handleSurfaceSelect}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-200">
        <p className="text-sm font-medium text-slate-700 mb-2">Referencia de colores</p>
        <Legend />
      </div>
    </div>
  );
}
