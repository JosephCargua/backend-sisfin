import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from './entities/account.entity';
import { JournalEntry } from './entities/journal-entry.entity';
import { JournalEntryLine } from './entities/journal-entry-line.entity';
import { Currency } from './entities/currency.entity';
import { ExchangeRate } from './entities/exchange-rate.entity';
import { AccountController } from './controllers/account.controller';
import { JournalEntryController } from './controllers/journal-entry.controller';
import { AccountService } from './services/account.service';
import { JournalEntryService } from './services/journal-entry.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Account,
      JournalEntry,
      JournalEntryLine,
      Currency,
      ExchangeRate,
    ]),
  ],
  controllers: [AccountController, JournalEntryController],
  providers: [AccountService, JournalEntryService],
  exports: [AccountService, JournalEntryService],
})
export class AccountingModule {}

