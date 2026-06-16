import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankAccount } from './entities/bank-account.entity';
import { CashAccount } from './entities/cash-account.entity';
import { BankTransaction } from './entities/bank-transaction.entity';
import { BankReconciliation } from './entities/bank-reconciliation.entity';
import { BankAccountController } from './controllers/bank-account.controller';
import { CashAccountController } from './controllers/cash-account.controller';
import { BankTransactionController } from './controllers/bank-transaction.controller';
import { BankAccountService } from './services/bank-account.service';
import { CashAccountService } from './services/cash-account.service';
import { BankTransactionService } from './services/bank-transaction.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BankAccount,
      CashAccount,
      BankTransaction,
      BankReconciliation,
    ]),
  ],
  controllers: [
    BankAccountController,
    CashAccountController,
    BankTransactionController,
  ],
  providers: [
    BankAccountService,
    CashAccountService,
    BankTransactionService,
  ],
  exports: [
    BankAccountService,
    CashAccountService,
    BankTransactionService,
  ],
})
export class BankingModule {}

