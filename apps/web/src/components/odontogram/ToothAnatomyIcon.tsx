import { cn } from '@/lib/utils';

type ToothKind = 'incisor' | 'canine' | 'premolar' | 'molar';

function toothKind(number: number): ToothKind {
  const pos = number % 10;
  if (pos <= 2) return 'incisor';
  if (pos === 3) return 'canine';
  if (pos <= 5) return 'premolar';
  return 'molar';
}

/** Dibujo lineal del diente (corona + raíces) estilo cartilla clínica. */
export function ToothAnatomyIcon({
  number,
  arch,
  isSelected,
  className,
}: {
  number: number;
  arch: 'upper' | 'lower';
  isSelected?: boolean;
  className?: string;
}) {
  const kind = toothKind(number);
  const flip = arch === 'upper';

  return (
    <svg
      width={28}
      height={40}
      viewBox="0 0 20 36"
      className={cn(
        'shrink-0 transition-opacity',
        flip && 'scale-y-[-1]',
        isSelected ? 'opacity-100' : 'opacity-90',
        className,
      )}
      aria-hidden
    >
      <g
        fill="#f8fafc"
        stroke={isSelected ? '#0f766e' : '#475569'}
        strokeWidth={isSelected ? 1.4 : 1.1}
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {kind === 'incisor' && (
          <>
            <path d="M8 14 L12 14 L11 28 L9 28 Z" />
            <path d="M10 14 L10 4" fill="none" />
          </>
        )}
        {kind === 'canine' && (
          <>
            <path d="M9 12 L11 12 L12 28 L8 28 Z" />
            <path d="M10 12 L10 3" fill="none" />
          </>
        )}
        {kind === 'premolar' && (
          <>
            <path d="M5 14 L15 14 L14 26 L6 26 Z" />
            <path d="M7 14 L6.5 5" fill="none" />
            <path d="M13 14 L13.5 5" fill="none" />
          </>
        )}
        {kind === 'molar' && (
          <>
            <path d="M3 15 L17 15 L16 24 L14 28 L6 28 L4 24 Z" />
            <path d="M6 15 L5 4" fill="none" />
            <path d="M10 15 L10 5" fill="none" />
            <path d="M14 15 L15 4" fill="none" />
          </>
        )}
      </g>
      {/* Línea de encía */}
      <line
        x1={3}
        y1={arch === 'upper' ? 28 : 14}
        x2={17}
        y2={arch === 'upper' ? 28 : 14}
        stroke="#94a3b8"
        strokeWidth={0.8}
      />
    </svg>
  );
}
