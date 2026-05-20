import { ToothStatus, ToothSurface } from '../enums/tooth-status.enum';

export interface ToothSurfaceRecord {
  surface: ToothSurface;
  status: ToothStatus;
  notes?: string;
  date?: string;
  material?: string;
  performedBy?: string;
}

export interface ToothRecord {
  toothNumber: number;
  surfaces: Partial<Record<ToothSurface, ToothSurfaceRecord>>;
  generalStatus: ToothStatus;
  notes?: string;
  updatedAt?: string;
}

export type Odontogram = Record<number, ToothRecord>;

export const ADULT_TEETH = [
  18, 17, 16, 15, 14, 13, 12, 11,
  21, 22, 23, 24, 25, 26, 27, 28,
  31, 32, 33, 34, 35, 36, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48,
];

export const CHILD_TEETH = [
  55, 54, 53, 52, 51,
  61, 62, 63, 64, 65,
  71, 72, 73, 74, 75,
  81, 82, 83, 84, 85,
];

// FDI quadrant groupings for rendering
export const UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
export const UPPER_LEFT  = [21, 22, 23, 24, 25, 26, 27, 28];
export const LOWER_LEFT  = [31, 32, 33, 34, 35, 36, 37, 38];
export const LOWER_RIGHT = [41, 42, 43, 44, 45, 46, 47, 48];
