import { InstallmentStatus, TreatmentPlanStatus, TreatmentPaymentType } from '../enums/treatment-plan.enum';

export interface TreatmentCatalogItem {
  id: string;
  name: string;
  category: string;
  defaultPrice: number;
  suggestedInstallments: number;
  paymentType: TreatmentPaymentType;
  description?: string;
  active: boolean;
}

export interface TreatmentInstallment {
  id: string;
  planId: string;
  number: number;
  label: string;
  amount: number;
  dueDate: string;
  status: InstallmentStatus;
  paidAt?: string;
  paymentMethod?: string;
  receiptNumber?: string;
  notes?: string;
  reminderSent?: boolean;
}

export interface TreatmentPlan {
  id: string;
  patientId: string;
  dentistId: string;
  catalogItemId?: string;
  title: string;
  category: string;
  totalPrice: number;
  downPayment: number;
  paidAmount: number;
  pendingAmount: number;
  installmentCount: number;
  startDate: string;
  status: TreatmentPlanStatus;
  notes?: string;
  prescriptionId?: string;
  toothNumber?: number;
  installments?: TreatmentInstallment[];
  catalogItem?: TreatmentCatalogItem;
  dentist?: { id: string; firstName: string; lastName: string };
  createdAt: string;
}
