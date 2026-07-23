import { Module } from '@nestjs/common';
import { ReportsModule } from '../reports/reports.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankAccount } from './entities/bank-account.entity';
import { CheckSequence } from './entities/check-sequence.entity';
import { CashAccount } from './entities/cash-account.entity';
import { BankTransaction } from './entities/bank-transaction.entity';
import { BankTransactionDetail } from './entities/bank-transaction-detail.entity';
import { BankReconciliation } from './entities/bank-reconciliation.entity';
import { FinancialDocumentPayment } from './entities/payment.entity';
import { PaymentDetail } from './entities/payment-detail.entity';
import { JournalEntry } from '../accounting/entities/journal-entry.entity';
import { JournalEntryLine } from '../accounting/entities/journal-entry-line.entity';
import { BankAccountController } from './controllers/bank-account.controller';
import { CashAccountController } from './controllers/cash-account.controller';
import { BankTransactionController } from './controllers/bank-transaction.controller';
import { BankAccountService } from './services/bank-account.service';
import { CashAccountService } from './services/cash-account.service';
import { BankTransactionService } from './services/bank-transaction.service';

import { BankReconciliationController } from './controllers/bank-reconciliation.controller';
import { BankReconciliationService } from './services/bank-reconciliation.service';

@Module({
  imports: [
    ReportsModule,
    TypeOrmModule.forFeature([
      BankAccount,
      CheckSequence,
      CashAccount,
      BankTransaction,
      BankTransactionDetail,
      BankReconciliation,
      FinancialDocumentPayment,
      PaymentDetail,
      JournalEntry,
      JournalEntryLine
    ]),
  ],
  controllers: [
    BankAccountController,
    CashAccountController,
    BankTransactionController,
    BankReconciliationController,
  ],
  providers: [
    BankAccountService,
    CashAccountService,
    BankTransactionService,
    BankReconciliationService,
  ],
  exports: [
    BankAccountService,
    CashAccountService,
    BankTransactionService,
    BankReconciliationService,
  ],
})
export class BankingModule {}

