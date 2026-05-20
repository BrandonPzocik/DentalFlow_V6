import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Study } from './study.entity';
import { StudiesService } from './studies.service';
import { StudiesController } from './studies.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Study])],
  providers: [StudiesService],
  controllers: [StudiesController],
  exports: [StudiesService],
})
export class StudiesModule {}
