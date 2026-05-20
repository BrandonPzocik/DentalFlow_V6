import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todas las configuraciones agrupadas + mapa plano' })
  getAll() { return this.service.getAllGrouped(); }

  @Get('flat')
  @ApiOperation({ summary: 'Mapa plano key->value de todas las configuraciones' })
  getFlat() { return this.service.getAll(); }

  @Post()
  @ApiOperation({ summary: 'Guardar múltiples configuraciones' })
  bulkSet(@Body() updates: Record<string, string>) {
    return this.service.bulkSet(updates);
  }

  @Post('seed')
  @ApiOperation({ summary: 'Inicializar configuraciones con valores por defecto' })
  seed() { return this.service.seedDefaults(); }
}
