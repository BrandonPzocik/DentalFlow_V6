import { IsEnum, IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ToothStatus, ToothSurface } from '@dentaflow/shared';

export class RegisterTreatmentDto {
  @ApiProperty({ example: 16 })
  @IsInt() @Min(11) @Max(85)
  toothNumber: number;

  @ApiPropertyOptional({ enum: ToothSurface })
  @IsEnum(ToothSurface) @IsOptional()
  surface?: ToothSurface;

  @ApiProperty({ enum: ToothStatus })
  @IsEnum(ToothStatus)
  status: ToothStatus;

  @ApiPropertyOptional({ example: 'Resina compuesta' })
  @IsString() @IsOptional()
  material?: string;

  @ApiPropertyOptional({ example: 'Obturación clase II mésio-oclusal' })
  @IsString() @IsOptional()
  notes?: string;
}
