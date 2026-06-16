import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from '../services/dashboard.service';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener datos del dashboard' })
  @ApiQuery({ name: 'date', required: false, description: 'Fecha para los balances (YYYY-MM-DD)' })
  getDashboardData(@Query('date') date?: string) {
    return this.dashboardService.getDashboardData(date);
  }
}

