import { getDundeeEmbedSrc, getDundeeToothLabel, hasDundeeSingleModel, DUNDEE_COLLECTION_URL } from '@/lib/dundeeSketchfab';
import { cn } from '@/lib/utils';

interface Props {
  toothNumber?: number;
  compact?: boolean;
  className?: string;
}

/**
 * Visor embebido de Sketchfab — colección Dundee Tooth Morphology o modelo por diente.
 * @see https://sketchfab.com/DundeeDental/collections/dundee-tooth-morphology-574c456663334fe89c78503a975dc946
 */
export function SketchfabDundeeViewer({ toothNumber, compact, className }: Props) {
  const src = getDundeeEmbedSrc(toothNumber);
  const single = toothNumber ? hasDundeeSingleModel(toothNumber) : false;

  return (
    <div className={cn('flex flex-col', className)}>
      {toothNumber && (
        <p className="text-sm text-slate-600 mb-2">
          {single ? (
            <>
              <span className="font-medium text-slate-800">{getDundeeToothLabel(toothNumber)}</span>
              <span className="text-slate-500"> · FDI {toothNumber}</span>
            </>
          ) : (
            <>
              Sin modelo individual para FDI {toothNumber}. Navegá la colección y elegí el diente equivalente.
            </>
          )}
        </p>
      )}

      <div
        className={cn(
          'w-full overflow-hidden rounded-lg border border-slate-300 bg-slate-900',
          compact ? 'aspect-[4/3]' : 'aspect-video min-h-[240px]',
        )}
      >
        <iframe
          title={toothNumber ? `Morphología 3D diente ${toothNumber}` : 'Dundee Tooth Morphology'}
          src={src}
          className="w-full h-full border-0"
          allow="autoplay; fullscreen; xr-spatial-tracking"
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      <p className="text-xs text-slate-500 mt-2 leading-snug">
        <a
          href={DUNDEE_COLLECTION_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-teal-800 hover:text-teal-900"
        >
          Dundee Tooth Morphology
        </a>
        {' '}por{' '}
        <a
          href="https://sketchfab.com/DundeeDental"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-teal-800 hover:text-teal-900"
        >
          University of Dundee, School of Dentistry
        </a>
        {' '}en{' '}
        <a
          href="https://sketchfab.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-teal-800 hover:text-teal-900"
        >
          Sketchfab
        </a>
        . Licencia CC Attribution. Rotá el modelo con clic y arrastre.
      </p>
    </div>
  );
}
