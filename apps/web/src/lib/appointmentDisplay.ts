import { AppointmentStatus } from '@dentaflow/shared';
import { getStatusConfig } from './appointmentStatus';

export function isCancelledAppointment(apt: { status: string }): boolean {
  return apt.status === AppointmentStatus.CANCELLED;
}

export function isPatientConfirmed(apt: { status: string; whatsappStatus?: string }): boolean {
  return (
    apt.status === AppointmentStatus.CONFIRMED_BY_PATIENT ||
    apt.whatsappStatus === 'confirmed'
  );
}

/** Estilos de bloque/lista según estado del turno */
export function getAppointmentVisual(apt: { status: string; whatsappStatus?: string }) {
  const cfg = getStatusConfig(apt.status as AppointmentStatus);
  const cancelled = isCancelledAppointment(apt);

  if (cancelled) {
    return {
      rowClass: 'bg-slate-50/80 opacity-75 hover:opacity-90',
      blockClass: 'bg-slate-50/90 border border-slate-200 border-l-[4px] border-l-dashed opacity-80 rounded-lg',
      borderLeftColor: cfg.borderColor,
      nameClass: 'text-slate-500 line-through font-medium',
      cancelled: true,
    };
  }

  return {
    rowClass: 'hover:bg-slate-50',
    blockClass: 'bg-white border border-slate-200 border-l-[4px] rounded-lg',
    borderLeftColor: cfg.borderColor,
    nameClass: 'text-slate-900 font-medium',
    cancelled: false,
  };
}

/** Franja libre tras cancelación o hueco */
export function getAvailableSlotClass() {
  return 'slot-available flex items-center justify-center gap-2 w-full min-h-[52px] px-3 py-2';
}
