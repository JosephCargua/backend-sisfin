import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PeriodLockService } from '../services/period-lock.service';

@ApiTags('Period Locks')
@Controller('period-locks')
export class PeriodLockController {
  constructor(private readonly periodLockService: PeriodLockService) {}

  @Post(':year/:month/lock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lock a period' })
  lockPeriod(
    @Param('year') year: number,
    @Param('month') month: number,
    @Body('userId') userId?: string,
  ) {
    return this.periodLockService.lockPeriod(+year, +month, userId);
  }

  @Patch(':year/:month/unlock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unlock a period' })
  unlockPeriod(@Param('year') year: number, @Param('month') month: number) {
    return this.periodLockService.unlockPeriod(+year, +month);
  }

  @Get(':year/:month/status')
  @ApiOperation({ summary: 'Check if period is locked' })
  checkStatus(@Param('year') year: number, @Param('month') month: number) {
    return this.periodLockService.isPeriodLocked(+year, +month);
  }

  @Get()
  @ApiOperation({ summary: 'Get all period locks' })
  findAll() {
    return this.periodLockService.findAll();
  }
}

