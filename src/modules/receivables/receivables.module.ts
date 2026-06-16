import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from './entities/customer.entity';
import { Invoice } from './entities/invoice.entity';
import { Payment } from './entities/payment.entity';
import { CustomerController } from './controllers/customer.controller';
import { InvoiceController } from './controllers/invoice.controller';
import { CustomerService } from './services/customer.service';
import { InvoiceService } from './services/invoice.service';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, Invoice, Payment])],
  controllers: [CustomerController, InvoiceController],
  providers: [CustomerService, InvoiceService],
  exports: [CustomerService, InvoiceService],
})
export class ReceivablesModule {}

