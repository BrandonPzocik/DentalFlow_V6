import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SocialWork } from './social-work.entity';
import { NomenclatorItem } from './nomenclator.entity';
import { SocialWorksService } from './social-works.service';
import { SocialWorksController } from './social-works.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SocialWork, NomenclatorItem])],
  providers: [SocialWorksService],
  controllers: [SocialWorksController],
  exports: [SocialWorksService],
})
export class SocialWorksModule {}
