import { IsString, IsNumber, IsOptional, IsInt, Min, IsEnum, IsDateString, IsBoolean } from 'class-validator';
import { TreatmentPlanStatus } from '@dentaflow/shared';

export class CreateTreatmentPlanDto {
  @IsOptional()
  @IsString()
  catalogItemId?: string;

  @IsString()
  title: string;

  @IsString()
  category: string;

  @IsNumber()
  @Min(0)
  totalPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  downPayment?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  installmentCount?: number;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  toothNumber?: number;

  @IsOptional()
  @IsString()
  prescriptionId?: string;
}

export class CreateFromBudgetDto {
  @IsInt()
  @Min(1)
  installmentCount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  downPayment?: number;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class PayInstallmentDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  paymentMethod: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  sendReceipt?: boolean;
}

export class UpdatePlanStatusDto {
  @IsEnum(TreatmentPlanStatus)
  status: TreatmentPlanStatus;
}
