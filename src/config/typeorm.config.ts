import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Account } from '../modules/accounting/entities/account.entity';
import { JournalEntry } from '../modules/accounting/entities/journal-entry.entity';
import { JournalEntryLine } from '../modules/accounting/entities/journal-entry-line.entity';
import { Currency } from '../modules/accounting/entities/currency.entity';
import { ExchangeRate } from '../modules/accounting/entities/exchange-rate.entity';
import { AccountingTemplate } from '../modules/automation/entities/accounting-template.entity';
import { AccountingTemplateLine } from '../modules/automation/entities/accounting-template-line.entity';
import { PeriodLock } from '../modules/automation/entities/period-lock.entity';
import { CostCenter } from '../modules/automation/entities/cost-center.entity';
import { Product } from '../modules/inventory/entities/product.entity';
import { InventoryMovement } from '../modules/inventory/entities/inventory-movement.entity';
import { Customer } from '../modules/receivables/entities/customer.entity';
import { Invoice } from '../modules/receivables/entities/invoice.entity';
import { Payment } from '../modules/receivables/entities/payment.entity';
import { Supplier } from '../modules/payables/entities/supplier.entity';
import { SupplierInvoice } from '../modules/payables/entities/supplier-invoice.entity';
import { SupplierPayment } from '../modules/payables/entities/supplier-payment.entity';
import { BankAccount } from '../modules/banking/entities/bank-account.entity';
import { CashAccount } from '../modules/banking/entities/cash-account.entity';
import { BankTransaction } from '../modules/banking/entities/bank-transaction.entity';
import { BankReconciliation } from '../modules/banking/entities/bank-reconciliation.entity';
import { ElectronicInvoice } from '../modules/tax/entities/electronic-invoice.entity';
import { ElectronicDocumentRegistration } from '../modules/tax/entities/electronic-document-registration.entity';
import { ElectronicDocumentLineItem } from '../modules/tax/entities/electronic-document-line-item.entity';
import { Retention } from '../modules/tax/entities/retention.entity';
import { ATS } from '../modules/tax/entities/ats.entity';
import { FinancialDocument } from '../modules/documents/entities/financial-document.entity';
import { FinancialDocumentLine } from '../modules/documents/entities/financial-document-line.entity';

export const typeOrmConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const host = configService.get<string>('DB_HOST', 'localhost');
  const useSsl =
    configService.get('DB_SSL') === 'true' || host.includes('supabase.com');

  return {
  type: 'postgres',
  host,
  port: configService.get<number>('DB_PORT', 5432),
  username: configService.get('DB_USERNAME', 'postgres'),
  password: configService.get('DB_PASSWORD', 'postgres'),
  database: configService.get('DB_DATABASE', 'sisfin_db'),
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  entities: [
    Account,
    JournalEntry,
    JournalEntryLine,
    Currency,
    ExchangeRate,
    AccountingTemplate,
    AccountingTemplateLine,
    PeriodLock,
    CostCenter,
    Product,
    InventoryMovement,
    Customer,
    Invoice,
    Payment,
    Supplier,
    SupplierInvoice,
    SupplierPayment,
    BankAccount,
    CashAccount,
    BankTransaction,
    BankReconciliation,
    ElectronicInvoice,
    ElectronicDocumentRegistration,
    ElectronicDocumentLineItem,
    Retention,
    ATS,
    FinancialDocument,
    FinancialDocumentLine,
  ],
  synchronize: configService.get('NODE_ENV') === 'development',
  logging: configService.get('NODE_ENV') === 'development',
  migrations: ['dist/migrations/*.js'],
  migrationsRun: false,
  };
};

