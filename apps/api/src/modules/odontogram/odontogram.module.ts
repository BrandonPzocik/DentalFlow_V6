import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OdontogramRecord } from './odontogram.entity';
import { OdontogramService } from './odontogram.service';
import { OdontogramController } from './odontogram.controller';

@Module({
  imports: [TypeOrmModule.forFeature([OdontogramRecord])],
  providers: [OdontogramService],
  controllers: [OdontogramController],
  exports: [OdontogramService],
})
export class OdontogramModule {}
