import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Supplier } from './entities/supplier.entity';
import { SupplierInvoice } from './entities/supplier-invoice.entity';
import { SupplierPayment } from './entities/supplier-payment.entity';
import { SupplierController } from './controllers/supplier.controller';
import { SupplierInvoiceController } from './controllers/supplier-invoice.controller';
import { SupplierService } from './services/supplier.service';
import { SupplierInvoiceService } from './services/supplier-invoice.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Supplier, SupplierInvoice, SupplierPayment]),
  ],
  controllers: [SupplierController, SupplierInvoiceController],
  providers: [SupplierService, SupplierInvoiceService],
  exports: [SupplierService, SupplierInvoiceService],
})
export class PayablesModule {}

