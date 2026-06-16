import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SupplierInvoiceService } from '../services/supplier-invoice.service';
import { CreateSupplierInvoiceDto } from '../dto/create-supplier-invoice.dto';
import { CreateSupplierPaymentDto } from '../dto/create-supplier-payment.dto';

@ApiTags('Supplier Invoices')
@Controller('supplier-invoices')
export class SupplierInvoiceController {
  constructor(
    private readonly supplierInvoiceService: SupplierInvoiceService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new supplier invoice' })
  create(@Body() createInvoiceDto: CreateSupplierInvoiceDto) {
    return this.supplierInvoiceService.create(createInvoiceDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all supplier invoices' })
  findAll() {
    return this.supplierInvoiceService.findAll();
  }

  @Get('overdue')
  @ApiOperation({ summary: 'Get overdue supplier invoices' })
  getOverdue() {
    return this.supplierInvoiceService.getOverdueInvoices();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get supplier invoice by ID' })
  findOne(@Param('id') id: string) {
    return this.supplierInvoiceService.findOne(id);
  }

  @Get('supplier/:supplierId')
  @ApiOperation({ summary: 'Get invoices by supplier' })
  findBySupplier(@Param('supplierId') supplierId: string) {
    return this.supplierInvoiceService.findBySupplier(supplierId);
  }

  @Get(':id/payments')
  @ApiOperation({ summary: 'Get invoice payments' })
  getPayments(@Param('id') id: string) {
    return this.supplierInvoiceService.getInvoicePayments(id);
  }

  @Post('payments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Apply payment to supplier invoice' })
  applyPayment(@Body() createPaymentDto: CreateSupplierPaymentDto) {
    return this.supplierInvoiceService.applyPayment(createPaymentDto);
  }
}

