import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  private readonly startTime = new Date();

  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  health() {
    const uptime = Math.floor((Date.now() - this.startTime.getTime()) / 1000);
    const uptimeMinutes = Math.floor(uptime / 60);
    const uptimeSeconds = uptime % 60;
    
    return {
      status: 'ok',
      service: 'quiz-api-server',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: uptime,
        formatted: `${uptimeMinutes}m ${uptimeSeconds}s`,
      },
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unitMB: 'MB',
      },
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
