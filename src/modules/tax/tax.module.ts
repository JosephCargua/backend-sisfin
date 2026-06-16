import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ElectronicInvoice } from './entities/electronic-invoice.entity';
import { ElectronicDocumentRegistration } from './entities/electronic-document-registration.entity';
import { ElectronicDocumentLineItem } from './entities/electronic-document-line-item.entity';
import { Retention } from './entities/retention.entity';
import { ATS } from './entities/ats.entity';
import { ElectronicInvoiceController } from './controllers/electronic-invoice.controller';
import { ElectronicDocumentRegistrationController } from './controllers/electronic-document-registration.controller';
import { RetentionController } from './controllers/retention.controller';
import { ATSController } from './controllers/ats.controller';
import { TaxCalculationController } from './controllers/tax-calculation.controller';
import { ElectronicInvoiceService } from './services/electronic-invoice.service';
import { RetentionService } from './services/retention.service';
import { ATSService } from './services/ats.service';
import { TaxCalculationService } from './services/tax-calculation.service';
import { XmlGeneratorService } from './services/xml-generator.service';
import { AccessKeyGeneratorService } from './services/access-key-generator.service';
import { ElectronicDocumentRegistrationService } from './services/electronic-document-registration.service';
import { XmlInvoiceParserService } from './services/xml-invoice-parser.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ElectronicInvoice,
      ElectronicDocumentRegistration,
      ElectronicDocumentLineItem,
      Retention,
      ATS,
    ]),
  ],
  controllers: [
    ElectronicInvoiceController,
    ElectronicDocumentRegistrationController,
    RetentionController,
    ATSController,
    TaxCalculationController,
  ],
  providers: [
    ElectronicInvoiceService,
    RetentionService,
    ATSService,
    TaxCalculationService,
    XmlGeneratorService,
    AccessKeyGeneratorService,
    ElectronicDocumentRegistrationService,
    XmlInvoiceParserService,
  ],
  exports: [
    ElectronicInvoiceService,
    ElectronicDocumentRegistrationService,
    RetentionService,
    ATSService,
    TaxCalculationService,
    XmlInvoiceParserService,
  ],
})
export class TaxModule {}
