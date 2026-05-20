import {
  IsString, IsNotEmpty, IsOptional, IsEmail,
  IsDateString, IsBoolean, IsEnum, IsPhoneNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BloodType } from '../patient.entity';

export class CreatePatientDto {
  @ApiProperty({ example: 'Juan' })
  @IsString() @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Pérez' })
  @IsString() @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: '32456789' })
  @IsString() @IsNotEmpty()
  dni: string;

  @ApiProperty({ example: '1985-03-15' })
  @IsDateString()
  dateOfBirth: string;

  @ApiProperty({ example: '+54 9 11 1234-5678' })
  @IsString() @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ example: 'juan@email.com' })
  @IsEmail() @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'Av. Corrientes 1234, CABA' })
  @IsString() @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: 'Buenos Aires' })
  @IsString() @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: 'Contador' })
  @IsString() @IsOptional()
  occupation?: string;

  @ApiPropertyOptional({ example: 'OSDE' })
  @IsString() @IsOptional()
  socialWork?: string;

  @ApiPropertyOptional({ example: '123456789' })
  @IsString() @IsOptional()
  affiliateNumber?: string;

  @ApiPropertyOptional({ example: '210' })
  @IsString() @IsOptional()
  plan?: string;

  @ApiPropertyOptional({ enum: BloodType })
  @IsEnum(BloodType) @IsOptional()
  bloodType?: BloodType;

  @ApiPropertyOptional({ default: false })
  @IsBoolean() @IsOptional()
  hasAllergies?: boolean;

  @ApiPropertyOptional({ example: 'Penicilina, Ibuprofeno' })
  @IsString() @IsOptional()
  allergiesDetail?: string;

  @ApiPropertyOptional({ example: 'Enalapril 10mg' })
  @IsString() @IsOptional()
  currentMedication?: string;

  @ApiPropertyOptional({ example: 'Diabetes tipo 2, Hipertensión' })
  @IsString() @IsOptional()
  systemicDiseases?: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean() @IsOptional()
  isPregnant?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsBoolean() @IsOptional()
  isBruxist?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsBoolean() @IsOptional()
  acceptsWhatsapp?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsBoolean() @IsOptional()
  acceptsEmail?: boolean;

  @ApiPropertyOptional()
  @IsString() @IsOptional()
  medicalNotes?: string;
}
