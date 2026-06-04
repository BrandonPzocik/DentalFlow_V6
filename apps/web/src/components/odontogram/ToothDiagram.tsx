import {
  ToothStatus,
  ToothSurface,
  TOOTH_STATUS_COLORS,
  ToothRecord,
} from '@dentaflow/shared';
import { cn } from '@/lib/utils';
import { ALL_SURFACES_ORDER } from './odontogram.constants';

export function getSurfacePath(surface: ToothSurface, cx: number, cy: number, r: number): string {
  const s = r * 0.42;
  switch (surface) {
    case ToothSurface.OCCLUSAL:
      return `M${cx - s},${cy - s} L${cx + s},${cy - s} L${cx + s},${cy + s} L${cx - s},${cy + s}Z`;
    case ToothSurface.VESTIBULAR:
      return `M${cx - r},${cy - r} L${cx + r},${cy - r} L${cx + s},${cy - s} L${cx - s},${cy - s}Z`;
    case ToothSurface.PALATAL:
      return `M${cx - r},${cy + r} L${cx + r},${cy + r} L${cx + s},${cy + s} L${cx - s},${cy + s}Z`;
    case ToothSurface.MESIAL:
      return `M${cx - r},${cy - r} L${cx - s},${cy - s} L${cx - s},${cy + s} L${cx - r},${cy + r}Z`;
    case ToothSurface.DISTAL:
      return `M${cx + r},${cy - r} L${cx + s},${cy - s} L${cx + s},${cy + s} L${cx + r},${cy + r}Z`;
    default:
      return '';
  }
}

const SIZES = {
  sm: { svg: 34, cx: 17, cy: 17, r: 13 },
  lg: { svg: 140, cx: 70, cy: 70, r: 52 },
} as const;

interface Props {
  record?: ToothRecord;
  isSelected?: boolean;
  selectedSurface: ToothSurface | null;
  size?: keyof typeof SIZES;
  onToothClick?: () => void;
  onSurfaceSelect: (surface: ToothSurface) => void;
  className?: string;
}

export function ToothDiagram({
  record,
  isSelected = false,
  selectedSurface,
  size = 'sm',
  onToothClick,
  onSurfaceSelect,
  className,
}: Props) {
  const { svg, cx, cy, r } = SIZES[size];
  const isAbsent = record?.generalStatus === ToothStatus.ABSENT;
  const strokeScale = size === 'lg' ? 1.4 : 1;

  return (
    <div
      className={cn(
        'relative cursor-pointer transition-transform',
        isSelected && 'scale-105',
        size === 'lg' && 'hover:scale-[1.02]',
        className,
      )}
      onClick={onToothClick}
    >
      <svg width={svg} height={svg} viewBox={`0 0 ${svg} ${svg}`} className="block">
        {isSelected && (
          <rect
            x={cx - r - 1}
            y={cy - r - 1}
            width={(r + 1) * 2}
            height={(r + 1) * 2}
            rx={size === 'lg' ? 6 : 3}
            fill="none"
            stroke="#0f766e"
            strokeWidth={1.5 * strokeScale}
          />
        )}
        <rect
          x={cx - r}
          y={cy - r}
          width={r * 2}
          height={r * 2}
          rx={size === 'lg' ? 4 : 2}
          fill={isAbsent ? '#e2e8f0' : '#fff'}
          stroke={isSelected ? '#0f766e' : '#94a3b8'}
          strokeWidth={(isSelected ? 1.5 : 1) * strokeScale}
        />
        {isAbsent && (
          <>
            <line
              x1={cx - r * 0.45}
              y1={cy - r * 0.45}
              x2={cx + r * 0.45}
              y2={cy + r * 0.45}
              stroke="#64748b"
              strokeWidth={1.5 * strokeScale}
              strokeLinecap="round"
            />
            <line
              x1={cx + r * 0.45}
              y1={cy - r * 0.45}
              x2={cx - r * 0.45}
              y2={cy + r * 0.45}
              stroke="#64748b"
              strokeWidth={1.5 * strokeScale}
              strokeLinecap="round"
            />
          </>
        )}
        {!isAbsent &&
          ALL_SURFACES_ORDER.map((surface) => {
            const surfaceRecord = record?.surfaces[surface];
            const color = surfaceRecord ? TOOTH_STATUS_COLORS[surfaceRecord.status] : 'transparent';
            const faceSelected = isSelected && selectedSurface === surface;
            return (
              <path
                key={surface}
                d={getSurfacePath(surface, cx, cy, r)}
                fill={color}
                fillOpacity={color === 'transparent' ? 0 : 0.88}
                stroke={faceSelected ? '#0f766e' : '#cbd5e1'}
                strokeWidth={(faceSelected ? 1.2 : 0.5) * strokeScale}
                className="hover:opacity-80 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onSurfaceSelect(surface);
                }}
              />
            );
          })}
        {record?.generalStatus &&
          record.generalStatus !== ToothStatus.HEALTHY &&
          !isAbsent && (
            <circle
              cx={cx}
              cy={cy}
              r={size === 'lg' ? 8 : 3.5}
              fill={TOOTH_STATUS_COLORS[record.generalStatus]}
              stroke="white"
              strokeWidth={size === 'lg' ? 1.2 : 0.8}
            />
          )}
      </svg>
    </div>
  );
}
