import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'Raíz — enlaces útiles de la API' })
  root() {
    return {
      app: 'DentaFlow API',
      status: 'running',
      health: '/api/health',
      docs: '/api/docs',
      api: '/api',
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check del sistema' })
  health() {
    return {
      status: 'ok',
      app: 'DentaFlow API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
