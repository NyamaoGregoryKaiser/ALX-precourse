import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags, ApiResponse, ApiOperation } from '@nestjs/swagger';

/**
 * Root controller for basic application health checks.
 */
@ApiTags('Health Check')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Returns a simple 'Hello World!' message to indicate the API is running.
   * @returns {string} A greeting message.
   */
  @Get()
  @ApiOperation({ summary: 'Get application health status' })
  @ApiResponse({ status: 200, description: 'Application is running.' })
  getHello(): string {
    return this.appService.getHello();
  }
}