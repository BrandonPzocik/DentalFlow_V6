import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNomenclatorItemDto {
  @ApiProperty({ example: '0401' })
  @IsString() @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Obturación simple (resina)' })
  @IsString() @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 4800 })
  @IsNumber() @Min(0)
  unitValue: number;

  @ApiPropertyOptional({ example: 'Operatoria' })
  @IsString() @IsOptional()
  category?: string;
}
