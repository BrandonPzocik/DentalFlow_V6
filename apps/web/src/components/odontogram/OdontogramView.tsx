import {
  ToothStatus, ToothSurface,
  TOOTH_STATUS_COLORS, TOOTH_STATUS_LABELS,
  Odontogram, ToothRecord,
  UPPER_RIGHT, UPPER_LEFT, LOWER_LEFT, LOWER_RIGHT,
} from '@dentaflow/shared';
import { cn } from '@/lib/utils';
import { ToothAnatomyIcon } from './ToothAnatomyIcon';

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

function SchematicSquare({
  number,
  record,
  isSelected,
  selectedSurface,
  onSelect,
  onSurfaceSelect,
}: {
  number: number;
  record?: ToothRecord;
  isSelected: boolean;
  selectedSurface: ToothSurface | null;
  onSelect: () => void;
  onSurfaceSelect: (surface: ToothSurface) => void;
}) {
  const cx = 17, cy = 17, r = 13;
  const isAbsent = record?.generalStatus === ToothStatus.ABSENT;

  return (
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
            rx={4}
            fill="none" stroke="#0d9488" strokeWidth="1.5"
          />
        )}
        <rect
          x={cx - r} y={cy - r} width={r * 2} height={r * 2}
          rx="3"
          fill={isAbsent ? '#e2e8f0' : '#ffffff'}
          stroke={isSelected ? '#0d9488' : '#94a3b8'}
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
              fillOpacity={color === 'transparent' ? 0 : 0.9}
              stroke={faceSelected ? '#0d9488' : '#cbd5e1'}
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
            cx={cx} cy={cy} r={4}
            fill={TOOTH_STATUS_COLORS[record.generalStatus]}
            stroke="white" strokeWidth="0.8"
          />
        )}
      </svg>
    </div>
  );
}

function ToothColumn({
  number,
  record,
  selection,
  arch,
  onSelect,
  onSurfaceSelect,
}: {
  number: number;
  record?: ToothRecord;
  selection: ToothSelection | null;
  arch: 'upper' | 'lower';
  onSelect: () => void;
  onSurfaceSelect: (surface: ToothSurface) => void;
}) {
  const isSelected = selection?.toothNumber === number;
  const selectedSurface = isSelected ? selection.surface : null;

  if (arch === 'upper') {
    return (
      <div className="flex flex-col items-center gap-0.5 w-[38px]">
        <button type="button" onClick={onSelect} className="p-0 border-0 bg-transparent">
          <ToothAnatomyIcon number={number} arch="upper" isSelected={isSelected} />
        </button>
        <span className="text-[10px] font-mono font-medium text-slate-600 leading-none">{number}</span>
        <SchematicSquare
          number={number}
          record={record}
          isSelected={isSelected}
          selectedSurface={selectedSurface}
          onSelect={onSelect}
          onSurfaceSelect={onSurfaceSelect}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-0.5 w-[38px]">
      <SchematicSquare
        number={number}
        record={record}
        isSelected={isSelected}
        selectedSurface={selectedSurface}
        onSelect={onSelect}
        onSurfaceSelect={onSurfaceSelect}
      />
      <span className="text-[10px] font-mono font-medium text-slate-600 leading-none">{number}</span>
      <button type="button" onClick={onSelect} className="p-0 border-0 bg-transparent">
        <ToothAnatomyIcon number={number} arch="lower" isSelected={isSelected} />
      </button>
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

function ArchHalf({
  teeth,
  odontogram,
  selection,
  arch,
  onSelect,
  onSurfaceSelect,
}: {
  teeth: number[];
  odontogram: Odontogram;
  selection: ToothSelection | null;
  arch: 'upper' | 'lower';
  onSelect: (n: number) => void;
  onSurfaceSelect: (n: number, s: ToothSurface) => void;
}) {
  return (
    <div className="flex gap-0.5">
      {teeth.map((num) => (
        <ToothColumn
          key={num}
          number={num}
          record={odontogram[num]}
          selection={selection}
          arch={arch}
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
    <div className="odontogram-panel p-5 overflow-x-auto">
      <p className="text-sm text-slate-600 mb-4">
        Arriba y abajo: forma del diente. En el centro: caras en <strong className="font-medium text-slate-800">cuadrados</strong> (clic en diente o cara).
      </p>
      <div className="min-w-[640px] bg-slate-50/80 border border-slate-200 rounded-xl p-4">
        {/* Arcada superior */}
        <div className="flex justify-center gap-2 mb-2">
          <div className="flex gap-0.5 border-r-2 border-slate-300 pr-2">
            <ArchHalf
              teeth={UPPER_RIGHT}
              odontogram={odontogram}
              selection={selection}
              arch="upper"
              onSelect={handleToothSelect}
              onSurfaceSelect={handleSurfaceSelect}
            />
          </div>
          <div className="flex gap-0.5 pl-2">
            <ArchHalf
              teeth={UPPER_LEFT}
              odontogram={odontogram}
              selection={selection}
              arch="upper"
              onSelect={handleToothSelect}
              onSurfaceSelect={handleSurfaceSelect}
            />
          </div>
        </div>

        <div className="relative my-3 py-1">
          <div className="absolute inset-x-4 top-1/2 border-t-2 border-dashed border-slate-300" />
          <div className="relative flex justify-center">
            <span className="bg-slate-50 px-3 py-0.5 text-xs font-medium text-slate-500 uppercase tracking-wider border border-slate-200 rounded-full">
              Línea media
            </span>
          </div>
        </div>

        {/* Arcada inferior */}
        <div className="flex justify-center gap-2 mt-2">
          <div className="flex gap-0.5 border-r-2 border-slate-300 pr-2">
            <ArchHalf
              teeth={LOWER_LEFT}
              odontogram={odontogram}
              selection={selection}
              arch="lower"
              onSelect={handleToothSelect}
              onSurfaceSelect={handleSurfaceSelect}
            />
          </div>
          <div className="flex gap-0.5 pl-2">
            <ArchHalf
              teeth={LOWER_RIGHT}
              odontogram={odontogram}
              selection={selection}
              arch="lower"
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
