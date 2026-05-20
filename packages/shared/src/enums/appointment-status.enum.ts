export enum AppointmentStatus {
  PENDING              = 'pending',
  CONFIRMED            = 'confirmed',
  CONFIRMED_BY_PATIENT = 'confirmed_by_patient',
  IN_PROGRESS          = 'in_progress',
  COMPLETED            = 'completed',
  ABSENT               = 'absent',
  CANCELLED            = 'cancelled',
}

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  [AppointmentStatus.PENDING]:              'Pendiente',
  [AppointmentStatus.CONFIRMED]:            'Confirmado',
  [AppointmentStatus.CONFIRMED_BY_PATIENT]: 'Confirmado por paciente',
  [AppointmentStatus.IN_PROGRESS]:          'En curso',
  [AppointmentStatus.COMPLETED]:            'Atendido',
  [AppointmentStatus.ABSENT]:               'Ausente',
  [AppointmentStatus.CANCELLED]:            'Cancelado',
};

export const APPOINTMENT_STATUS_COLORS: Record<AppointmentStatus, string> = {
  [AppointmentStatus.PENDING]:              '#94A3B8',
  [AppointmentStatus.CONFIRMED]:            '#3B82F6',
  [AppointmentStatus.CONFIRMED_BY_PATIENT]: '#6366F1',
  [AppointmentStatus.IN_PROGRESS]:          '#F59E0B',
  [AppointmentStatus.COMPLETED]:            '#10B981',
  [AppointmentStatus.ABSENT]:               '#EF4444',
  [AppointmentStatus.CANCELLED]:            '#6B7280',
};
