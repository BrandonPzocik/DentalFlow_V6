export enum TreatmentPlanStatus {
  ACTIVE    = 'active',
  PAUSED    = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum InstallmentStatus {
  PENDING = 'pending',
  PAID    = 'paid',
  OVERDUE = 'overdue',
  WAIVED  = 'waived',
}

export enum TreatmentPaymentType {
  SINGLE  = 'single',
  MONTHLY = 'monthly',
  SESSION = 'session',
}
