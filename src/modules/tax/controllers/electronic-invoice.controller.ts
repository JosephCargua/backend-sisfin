import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ElectronicInvoiceService } from '../services/electronic-invoice.service';
import { CreateElectronicInvoiceDto } from '../dto/create-electronic-invoice.dto';

@ApiTags('Facturación Electrónica')
@Controller('electronic-invoices')
export class ElectronicInvoiceController {
  constructor(
    private readonly electronicInvoiceService: ElectronicInvoiceService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear factura electrónica' })
  @ApiResponse({ status: 201, description: 'Factura creada exitosamente' })
  create(@Body() createInvoiceDto: CreateElectronicInvoiceDto) {
    return this.electronicInvoiceService.create(createInvoiceDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las facturas electrónicas' })
  findAll() {
    return this.electronicInvoiceService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener factura por ID' })
  findOne(@Param('id') id: string) {
    return this.electronicInvoiceService.findOne(id);
  }

  @Get('access-key/:accessKey')
  @ApiOperation({ summary: 'Obtener factura por clave de acceso' })
  findByAccessKey(@Param('accessKey') accessKey: string) {
    return this.electronicInvoiceService.findByAccessKey(accessKey);
  }

  @Patch(':id/sign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Firmar factura electrónica' })
  signInvoice(@Param('id') id: string) {
    return this.electronicInvoiceService.signInvoice(id);
  }

  @Patch(':id/authorize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autorizar factura electrónica' })
  authorizeInvoice(
    @Param('id') id: string,
    @Body('authorizationNumber') authorizationNumber: string,
  ) {
    return this.electronicInvoiceService.authorizeInvoice(id, authorizationNumber);
  }

  @Patch(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rechazar factura electrónica' })
  rejectInvoice(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.electronicInvoiceService.rejectInvoice(id, reason);
  }
}

