export enum ToothStatus {
  HEALTHY    = 'healthy',
  CAVITY     = 'cavity',
  FILLING    = 'filling',
  CROWN      = 'crown',
  ABSENT     = 'absent',
  IMPLANT    = 'implant',
  ROOT_CANAL = 'root_canal',
  EXTRACTION = 'extraction_indicated',
  SEALANT    = 'sealant',
  FRACTURE   = 'fracture',
  ERUPTING   = 'erupting',
  RETAINED   = 'retained',
  BRIDGE     = 'bridge',
  MOBILITY   = 'mobility',
}

export enum ToothSurface {
  MESIAL     = 'M',
  DISTAL     = 'D',
  OCCLUSAL   = 'O',
  VESTIBULAR = 'V',
  PALATAL    = 'P',
}

export const TOOTH_STATUS_COLORS: Record<ToothStatus, string> = {
  [ToothStatus.HEALTHY]:    '#ffffff',
  [ToothStatus.CAVITY]:     '#EF4444',
  [ToothStatus.FILLING]:    '#3B82F6',
  [ToothStatus.CROWN]:      '#F59E0B',
  [ToothStatus.ABSENT]:     '#6B7280',
  [ToothStatus.IMPLANT]:    '#8B5CF6',
  [ToothStatus.ROOT_CANAL]: '#EC4899',
  [ToothStatus.EXTRACTION]: '#DC2626',
  [ToothStatus.SEALANT]:    '#10B981',
  [ToothStatus.FRACTURE]:   '#F97316',
  [ToothStatus.ERUPTING]:   '#14B8A6',
  [ToothStatus.RETAINED]:   '#6366F1',
  [ToothStatus.BRIDGE]:     '#D97706',
  [ToothStatus.MOBILITY]:   '#BE185D',
};

export const TOOTH_STATUS_LABELS: Record<ToothStatus, string> = {
  [ToothStatus.HEALTHY]:    'Sano',
  [ToothStatus.CAVITY]:     'Caries',
  [ToothStatus.FILLING]:    'Obturación',
  [ToothStatus.CROWN]:      'Corona',
  [ToothStatus.ABSENT]:     'Ausente',
  [ToothStatus.IMPLANT]:    'Implante',
  [ToothStatus.ROOT_CANAL]: 'Endodoncia',
  [ToothStatus.EXTRACTION]: 'Extracción indicada',
  [ToothStatus.SEALANT]:    'Sellante',
  [ToothStatus.FRACTURE]:   'Fractura',
  [ToothStatus.ERUPTING]:   'En erupción',
  [ToothStatus.RETAINED]:   'Retenido',
  [ToothStatus.BRIDGE]:     'Puente',
  [ToothStatus.MOBILITY]:   'Movilidad',
};
