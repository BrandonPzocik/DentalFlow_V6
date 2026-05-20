import {
  IsArray, IsEnum, IsNotEmpty, IsNumber,
  IsOptional, IsString, IsUUID, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../invoice.entity';

export class InvoiceItemDto {
  @ApiPropertyOptional({ example: '0401' })
  @IsString() @IsOptional()
  nomenclatorCode?: string;

  @ApiProperty({ example: 'Obturación resina clase II' })
  @IsString() @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ example: 16 })
  @IsNumber() @IsOptional()
  toothNumber?: number;

  @ApiPropertyOptional({ example: 'MO' })
  @IsString() @IsOptional()
  surface?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsNumber() @Min(1) @IsOptional()
  quantity?: number;

  @ApiProperty({ example: 4800 })
  @IsNumber() @Min(0)
  unitPrice: number = 0;
}

export class CreateInvoiceDto {
  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional()
  @IsUUID() @IsOptional()
  socialWorkId?: string;

  @ApiPropertyOptional()
  @IsString() @IsOptional()
  socialWorkName?: string;

  @ApiPropertyOptional()
  @IsString() @IsOptional()
  affiliateNumber?: string;

  @ApiPropertyOptional()
  @IsString() @IsOptional()
  plan?: string;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ default: 0 })
  @IsNumber() @Min(0) @IsOptional()
  discountPercent?: number;

  @ApiPropertyOptional()
  @IsString() @IsOptional()
  notes?: string;

  @ApiProperty({ type: [InvoiceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];
}
