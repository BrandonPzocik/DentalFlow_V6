import { ToothSurface } from '@dentaflow/shared';

export const SURFACE_LABELS: Record<ToothSurface, string> = {
  [ToothSurface.VESTIBULAR]: 'Vestibular (frente)',
  [ToothSurface.PALATAL]: 'Palatino / Lingual',
  [ToothSurface.MESIAL]: 'Mesial (centro)',
  [ToothSurface.DISTAL]: 'Distal (afuera)',
  [ToothSurface.OCCLUSAL]: 'Oclusal / Incisal',
};

export const SURFACE_SHORT: Record<ToothSurface, string> = {
  [ToothSurface.VESTIBULAR]: 'V',
  [ToothSurface.PALATAL]: 'P',
  [ToothSurface.MESIAL]: 'M',
  [ToothSurface.DISTAL]: 'D',
  [ToothSurface.OCCLUSAL]: 'O',
};

export const ALL_SURFACES_ORDER: ToothSurface[] = [
  ToothSurface.VESTIBULAR,
  ToothSurface.MESIAL,
  ToothSurface.OCCLUSAL,
  ToothSurface.DISTAL,
  ToothSurface.PALATAL,
];
