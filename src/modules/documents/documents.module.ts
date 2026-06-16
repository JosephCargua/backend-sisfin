import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialDocument } from './entities/financial-document.entity';
import { FinancialDocumentLine } from './entities/financial-document-line.entity';
import { FinancialDocumentService } from './services/financial-document.service';
import { FinancialDocumentController } from './controllers/financial-document.controller';
import { TaxModule } from '../tax/tax.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FinancialDocument, FinancialDocumentLine]),
    TaxModule,
  ],
  controllers: [FinancialDocumentController],
  providers: [FinancialDocumentService],
  exports: [FinancialDocumentService],
})
export class DocumentsModule {}
