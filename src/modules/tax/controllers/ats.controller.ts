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
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ATSService } from '../services/ats.service';

@ApiTags('ATS - Anexo Transaccional Simplificado')
@Controller('ats')
export class ATSController {
  constructor(private readonly atsService: ATSService) {}

  @Post('generate/:year/:month')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generar ATS para un período' })
  generateATS(@Param('year') year: number, @Param('month') month: number) {
    return this.atsService.generateATS(+year, +month);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los ATS' })
  findAll() {
    return this.atsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener ATS por ID' })
  findOne(@Param('id') id: string) {
    return this.atsService.findOne(id);
  }

  @Get('period/:year/:month')
  @ApiOperation({ summary: 'Obtener ATS por período' })
  findByPeriod(@Param('year') year: number, @Param('month') month: number) {
    return this.atsService.findByPeriod(+year, +month);
  }

  @Patch(':id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar ATS al SRI' })
  submitATS(@Param('id') id: string) {
    return this.atsService.submitATS(id);
  }
}

