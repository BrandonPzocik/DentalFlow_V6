import { IsString, IsNotEmpty, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSocialWorkDto {
  @ApiProperty({ example: 'OSDE' })
  @IsString() @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'OSDE' })
  @IsString() @IsOptional()
  shortName?: string;

  @ApiPropertyOptional()
  @IsEmail() @IsOptional()
  contactEmail?: string;

  @ApiPropertyOptional()
  @IsString() @IsOptional()
  contactPhone?: string;

  @ApiPropertyOptional()
  @IsString() @IsOptional()
  website?: string;

  @ApiPropertyOptional()
  @IsString() @IsOptional()
  notes?: string;
}
