import {
  Controller, Get, Post, Put, Delete, Patch,
  Param, Body, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SocialWorksService } from './social-works.service';
import { CreateSocialWorkDto } from './dto/create-social-work.dto';
import { CreateNomenclatorItemDto } from './dto/create-nomenclator-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Social Works')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('social-works')
export class SocialWorksController {
  constructor(private readonly service: SocialWorksService) {}

  @Get()
  @ApiOperation({ summary: 'Listar obras sociales con nomenclador' })
  findAll() { return this.service.findAll(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  create(@Body() dto: CreateSocialWorkDto) { return this.service.create(dto); }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateSocialWorkDto>) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.service.remove(id); }

  @Post(':id/nomenclator')
  @ApiOperation({ summary: 'Agregar ítem al nomenclador' })
  addItem(@Param('id') id: string, @Body() dto: CreateNomenclatorItemDto) {
    return this.service.addNomenclatorItem(id, dto);
  }

  @Put(':id/nomenclator/:itemId')
  updateItem(@Param('itemId') itemId: string, @Body() dto: Partial<CreateNomenclatorItemDto>) {
    return this.service.updateNomenclatorItem(itemId, dto);
  }

  @Delete(':id/nomenclator/:itemId')
  removeItem(@Param('itemId') itemId: string) {
    return this.service.removeNomenclatorItem(itemId);
  }

  @Post(':id/nomenclator/seed')
  @ApiOperation({ summary: 'Cargar nomenclador básico predefinido' })
  seed(@Param('id') id: string) {
    return this.service.seedDefaultNomenclator(id);
  }
}
