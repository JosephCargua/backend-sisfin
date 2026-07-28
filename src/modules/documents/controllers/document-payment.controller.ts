import { Controller, Post, Body, Delete, Param, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DocumentPaymentService } from '../services/document-payment.service';
import { DocumentPayment } from '../entities/document-payment.entity';

@ApiTags('Document Payments')
@Controller('document-payments')
export class DocumentPaymentController {
  constructor(private readonly paymentService: DocumentPaymentService) {}

  @Post()
  @ApiOperation({ summary: 'Register a payment for a document' })
  create(@Body() data: Partial<DocumentPayment>) {
    return this.paymentService.create(data);
  }

  @Get()
  @ApiOperation({ summary: 'Get all payments' })
  findAll() {
    return this.paymentService.findAll();
  }

  @Get('document/:documentId')
  @ApiOperation({ summary: 'Get payments for a document' })
  getByDocument(@Param('documentId') documentId: string) {
    return this.paymentService.getByDocument(documentId);
  }

  @Delete('document/:documentId')
  @ApiOperation({ summary: 'Revert all payments for a document' })
  revertByDocument(@Param('documentId') documentId: string) {
    return this.paymentService.revertByDocument(documentId);
  }
}
