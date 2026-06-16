import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from '../accounting/entities/account.entity';
import { JournalEntryLine } from '../accounting/entities/journal-entry-line.entity';
import { ReportController } from './controllers/report.controller';
import { ReportService } from './services/report.service';
import { PdfGeneratorService } from './services/pdf-generator.service';
import { ExcelGeneratorService } from './services/excel-generator.service';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Account, JournalEntryLine]),
    AccountingModule,
  ],
  controllers: [ReportController],
  providers: [ReportService, PdfGeneratorService, ExcelGeneratorService],
  exports: [ReportService],
})
export class ReportsModule {}
