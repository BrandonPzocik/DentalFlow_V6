import type { ReactNode } from 'react';
import {
  ToothStatus, ToothSurface,
  TOOTH_STATUS_COLORS, TOOTH_STATUS_LABELS,
  Odontogram, ToothRecord,
  UPPER_RIGHT, UPPER_LEFT, LOWER_LEFT, LOWER_RIGHT,
} from '@dentaflow/shared';
import { ToothDiagram } from './ToothDiagram';

export interface ToothSelection {
  toothNumber: number;
  surface: ToothSurface | null;
}

interface OdontogramProps {
  odontogram: Odontogram;
  selection: ToothSelection | null;
  onSelect: (selection: ToothSelection | null) => void;
  headerAction?: ReactNode;
}

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
  return (
    <div className="flex flex-col items-center gap-1 w-9">
      {!isFlipped && (
        <span className="text-xs font-mono font-medium text-slate-600 leading-none">{number}</span>
      )}

      <ToothDiagram
        record={record}
        isSelected={isSelected}
        selectedSurface={selectedSurface}
        size="sm"
        onToothClick={onSelect}
        onSurfaceSelect={onSurfaceSelect}
        className="hover:scale-105"
      />

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

export function OdontogramView({ odontogram, selection, onSelect, headerAction }: OdontogramProps) {
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
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <p className="text-sm text-slate-600 flex-1 min-w-[12rem]">
          Clic en un diente o en una cara del cuadrado. El formulario de prestación aparece debajo.
        </p>
        {headerAction}
      </div>

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
