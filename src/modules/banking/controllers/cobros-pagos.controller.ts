import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CobrosPagosService } from '../services/cobros-pagos.service';

@ApiTags('Cobros Pagos')
@Controller('cobros-pagos')
export class CobrosPagosController {
  constructor(private readonly cobrosPagosService: CobrosPagosService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener listado unificado de cobros y pagos' })
  findAll(@Query() query: any) {
    return this.cobrosPagosService.findAll(query);
  }
}
