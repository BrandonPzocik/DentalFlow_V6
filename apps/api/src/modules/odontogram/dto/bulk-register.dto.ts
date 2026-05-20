import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { RegisterTreatmentDto } from './register-treatment.dto';

export class BulkRegisterDto {
  @ApiProperty({ type: [RegisterTreatmentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegisterTreatmentDto)
  treatments: RegisterTreatmentDto[];
}
