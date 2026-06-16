import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountingModule } from './modules/accounting/accounting.module';
import { AutomationModule } from './modules/automation/automation.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ReceivablesModule } from './modules/receivables/receivables.module';
import { PayablesModule } from './modules/payables/payables.module';
import { BankingModule } from './modules/banking/banking.module';
import { TaxModule } from './modules/tax/tax.module';
import { ReportsModule } from './modules/reports/reports.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { typeOrmConfig } from './config/typeorm.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: typeOrmConfig,
      inject: [ConfigService],
    }),
    AccountingModule,
    AutomationModule,
    InventoryModule,
    ReceivablesModule,
    PayablesModule,
        BankingModule,
        TaxModule,
        ReportsModule,
        DashboardModule,
        DocumentsModule,
      ],
    })
    export class AppModule {}

