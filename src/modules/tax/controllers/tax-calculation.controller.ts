import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TaxCalculationService } from '../services/tax-calculation.service';

@ApiTags('Cálculos de Impuestos')
@Controller('tax-calculations')
export class TaxCalculationController {
  constructor(
    private readonly taxCalculationService: TaxCalculationService,
  ) {}

  @Get('iva-rates')
  @ApiOperation({ summary: 'Obtener tarifas de IVA disponibles' })
  getIVARates() {
    return this.taxCalculationService.getIVARates();
  }

  @Get('retention-codes')
  @ApiOperation({ summary: 'Obtener códigos de retención disponibles' })
  getRetentionCodes() {
    return this.taxCalculationService.getRetentionCodes();
  }
}

