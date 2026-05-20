export interface PatientSummary {
  id: string;
  firstName: string;
  lastName: string;
  dni: string;
  dateOfBirth: string;
  phone: string;
  email?: string;
  socialWork?: string;
  affiliateNumber?: string;
  hasAllergies: boolean;
  get fullName(): string;
}
