import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class AppController {
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
