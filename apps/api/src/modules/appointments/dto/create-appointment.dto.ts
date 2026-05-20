import {
  IsDateString, IsEnum, IsInt, IsOptional,
  IsString, IsUUID, Min, Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus } from '@dentaflow/shared';

export class CreateAppointmentDto {
  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiProperty()
  @IsUUID()
  dentistId: string;

  @ApiProperty({ example: '2025-03-15T10:00:00.000Z' })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional({ default: 30 })
  @IsInt() @Min(15) @Max(240) @IsOptional()
  durationMinutes?: number;

  @ApiPropertyOptional({ example: 'Obturación' })
  @IsString() @IsOptional()
  treatmentType?: string;

  @ApiPropertyOptional()
  @IsString() @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ example: 'Sillón 1' })
  @IsString() @IsOptional()
  chair?: string;
}
