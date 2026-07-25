import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialDocument } from './entities/financial-document.entity';
import { FinancialDocumentLine } from './entities/financial-document-line.entity';
import { DocumentCrossing } from './entities/document-crossing.entity';
import { DocumentPayment } from './entities/document-payment.entity';
import { FinancialDocumentService } from './services/financial-document.service';
import { DocumentPaymentService } from './services/document-payment.service';
import { FinancialDocumentController } from './controllers/financial-document.controller';
import { DocumentPaymentController } from './controllers/document-payment.controller';
import { TaxModule } from '../tax/tax.module';
import { AccountingModule } from '../accounting/accounting.module';
import { ElectronicDocumentRegistration } from '../tax/entities/electronic-document-registration.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FinancialDocument,
      FinancialDocumentLine,
      DocumentCrossing,
      DocumentPayment,
      ElectronicDocumentRegistration
    ]),
    TaxModule,
    AccountingModule,
  ],
  controllers: [FinancialDocumentController, DocumentPaymentController],
  providers: [FinancialDocumentService, DocumentPaymentService],
  exports: [FinancialDocumentService, DocumentPaymentService],
})
export class DocumentsModule {}
