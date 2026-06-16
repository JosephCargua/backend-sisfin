import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from '../accounting/entities/account.entity';
import { BankAccount } from '../banking/entities/bank-account.entity';
import { CashAccount } from '../banking/entities/cash-account.entity';
import { Invoice } from '../receivables/entities/invoice.entity';
import { SupplierInvoice } from '../payables/entities/supplier-invoice.entity';
import { DashboardController } from './controllers/dashboard.controller';
import { DashboardService } from './services/dashboard.service';
import { AccountingModule } from '../accounting/accounting.module';
import { BankingModule } from '../banking/banking.module';
import { ReceivablesModule } from '../receivables/receivables.module';
import { PayablesModule } from '../payables/payables.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Account,
      BankAccount,
      CashAccount,
      Invoice,
      SupplierInvoice,
    ]),
    AccountingModule,
    BankingModule,
    ReceivablesModule,
    PayablesModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}

