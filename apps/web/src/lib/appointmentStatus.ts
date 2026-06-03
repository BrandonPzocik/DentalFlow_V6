import {
  Clock, CheckCircle, UserCheck, Play, CheckCircle2, UserX, XCircle, type LucideIcon,
} from 'lucide-react';
import { AppointmentStatus } from '@dentaflow/shared';

export interface AppointmentStatusConfig {
  label: string;
  borderColor: string;
  icon: LucideIcon;
  pillClass: string;
}

export const APPOINTMENT_STATUS_CONFIG: Record<AppointmentStatus, AppointmentStatusConfig> = {
  [AppointmentStatus.PENDING]: {
    label: 'Pendiente',
    borderColor: '#94A3B8',
    icon: Clock,
    pillClass: 'bg-slate-100 text-slate-700 border-slate-300',
  },
  [AppointmentStatus.CONFIRMED]: {
    label: 'Confirmado',
    borderColor: '#3B82F6',
    icon: CheckCircle,
    pillClass: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  [AppointmentStatus.CONFIRMED_BY_PATIENT]: {
    label: 'Confirmado por paciente',
    borderColor: '#6366F1',
    icon: UserCheck,
    pillClass: 'bg-indigo-50 text-indigo-900 border-indigo-200',
  },
  [AppointmentStatus.IN_PROGRESS]: {
    label: 'En curso',
    borderColor: '#F59E0B',
    icon: Play,
    pillClass: 'bg-amber-50 text-amber-900 border-amber-200',
  },
  [AppointmentStatus.COMPLETED]: {
    label: 'Atendido',
    borderColor: '#10B981',
    icon: CheckCircle2,
    pillClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  [AppointmentStatus.ABSENT]: {
    label: 'Ausente',
    borderColor: '#EF4444',
    icon: UserX,
    pillClass: 'bg-red-50 text-red-800 border-red-200',
  },
  [AppointmentStatus.CANCELLED]: {
    label: 'Cancelado',
    borderColor: '#6B7280',
    icon: XCircle,
    pillClass: 'bg-slate-100 text-slate-600 border-slate-300',
  },
};

export function getStatusConfig(status: AppointmentStatus): AppointmentStatusConfig {
  return APPOINTMENT_STATUS_CONFIG[status] ?? APPOINTMENT_STATUS_CONFIG[AppointmentStatus.PENDING];
}
