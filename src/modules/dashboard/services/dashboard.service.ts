import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Account } from '../../accounting/entities/account.entity';
import { AccountType } from '../../accounting/enums/account-type.enum';
import { JournalEntryService } from '../../accounting/services/journal-entry.service';
import { BankAccount } from '../../banking/entities/bank-account.entity';
import { CashAccount } from '../../banking/entities/cash-account.entity';
import { Invoice } from '../../receivables/entities/invoice.entity';
import { SupplierInvoice } from '../../payables/entities/supplier-invoice.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    @InjectRepository(BankAccount)
    private bankAccountRepository: Repository<BankAccount>,
    @InjectRepository(CashAccount)
    private cashAccountRepository: Repository<CashAccount>,
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(SupplierInvoice)
    private supplierInvoiceRepository: Repository<SupplierInvoice>,
    private journalEntryService: JournalEntryService,
    private dataSource: DataSource,
  ) {}

  async getDashboardData(date?: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const currentDate = date ? new Date(date) : new Date();
      const dateStr = currentDate.toISOString().split('T')[0];
      
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const startOfMonthStr = startOfMonth.toISOString().split('T')[0];

      const [
        balanceSheet,
        incomeStatement,
        bankAccounts,
        cashAccounts,
        totalReceivables,
        totalPayables,
      ] = await Promise.all([
        this.getBalanceSheetSummary(dateStr, queryRunner),
        this.getIncomeStatementSummary(startOfMonthStr, dateStr, queryRunner),
        this.getBankAccountsBalance(dateStr),
        this.getCashAccountsBalance(dateStr),
        this.getTotalReceivables(),
        this.getTotalPayables(),
      ]);

      return {
        date: dateStr,
        balanceSheet,
        incomeStatement,
        bankAccounts,
        cashAccounts,
        totalReceivables,
        totalPayables,
        summary: {
          totalAssets: balanceSheet.totalAssets,
          totalLiabilities: balanceSheet.totalLiabilities,
          totalEquity: balanceSheet.totalEquity,
          totalIncome: incomeStatement.totalIncome,
          totalExpenses: incomeStatement.totalExpenses,
          netIncome: incomeStatement.totalIncome - incomeStatement.totalExpenses,
          totalCash: bankAccounts.totalBalance + cashAccounts.totalBalance,
          totalReceivables,
          totalPayables,
        },
      };
    } finally {
      await queryRunner.release();
    }
  }

  private async getBalanceSheetSummary(
    date: string,
    queryRunner: any,
  ): Promise<any> {
    const assets = await this.getAccountBalances(
      AccountType.ASSET,
      date,
      queryRunner,
    );
    const liabilities = await this.getAccountBalances(
      AccountType.LIABILITY,
      date,
      queryRunner,
    );
    const equity = await this.getAccountBalances(
      AccountType.EQUITY,
      date,
      queryRunner,
    );

    return {
      assets: assets.slice(0, 5),
      liabilities: liabilities.slice(0, 5),
      equity: equity.slice(0, 5),
      totalAssets: assets.reduce((sum, acc) => sum + (acc.balance || 0), 0),
      totalLiabilities: liabilities.reduce(
        (sum, acc) => sum + (acc.balance || 0),
        0,
      ),
      totalEquity: equity.reduce((sum, acc) => sum + (acc.balance || 0), 0),
    };
  }

  private async getIncomeStatementSummary(
    startDate: string,
    endDate: string,
    queryRunner: any,
  ): Promise<any> {
    const income = await this.getAccountBalances(
      AccountType.INCOME,
      endDate,
      queryRunner,
      startDate,
    );
    const expenses = await this.getAccountBalances(
      AccountType.EXPENSE,
      endDate,
      queryRunner,
      startDate,
    );

    return {
      income: income.slice(0, 5),
      expenses: expenses.slice(0, 5),
      totalIncome: income.reduce((sum, acc) => sum + (acc.balance || 0), 0),
      totalExpenses: expenses.reduce(
        (sum, acc) => sum + (acc.balance || 0),
        0,
      ),
    };
  }

  private async getAccountBalances(
    type: AccountType,
    endDate: string,
    queryRunner: any,
    startDate?: string,
  ): Promise<any[]> {
    try {
      const accounts = await queryRunner.manager.find(Account, {
        where: { type, isActive: true },
      });

      const balances = await Promise.all(
        accounts.map(async (account: Account) => {
          try {
            const ledger = await this.journalEntryService.getGeneralLedger(
              account.id,
              startDate || '2000-01-01',
              endDate,
            );
            return {
              code: account.code,
              name: account.name,
              balance: ledger.finalBalance || 0,
            };
          } catch (error) {
            return {
              code: account.code,
              name: account.name,
              balance: 0,
            };
          }
        }),
      );

      return balances.filter((b) => b.balance !== 0);
    } catch (error) {
      console.error('Error in getAccountBalances:', error);
      return [];
    }
  }

  private async getBankAccountsBalance(date: string): Promise<any> {
    try {
      const accounts = await this.bankAccountRepository.find({
        where: { isActive: true },
      });

      const accountsWithBalance = await Promise.all(
        accounts.map(async (acc) => {
          try {
            const ledger = await this.journalEntryService.getGeneralLedger(
              acc.accountId,
              '2000-01-01',
              date,
            );
            return {
              id: acc.id,
              name: `${acc.bankName} - ${acc.accountNumber}`,
              balance: ledger.finalBalance || 0,
            };
          } catch (error) {
            return {
              id: acc.id,
              name: `${acc.bankName} - ${acc.accountNumber}`,
              balance: 0,
            };
          }
        }),
      );

      const totalBalance = accountsWithBalance.reduce(
        (sum, acc) => sum + (acc.balance || 0),
        0,
      );

      return {
        accounts: accountsWithBalance,
        totalBalance,
      };
    } catch (error) {
      console.error('Error getting bank accounts balance:', error);
      return { accounts: [], totalBalance: 0 };
    }
  }

  private async getCashAccountsBalance(date: string): Promise<any> {
    try {
      const accounts = await this.cashAccountRepository.find({
        where: { isActive: true },
      });

      const accountsWithBalance = await Promise.all(
        accounts.map(async (acc) => {
          try {
            const ledger = await this.journalEntryService.getGeneralLedger(
              acc.accountId,
              '2000-01-01',
              date,
            );
            return {
              id: acc.id,
              name: acc.name,
              balance: ledger.finalBalance || 0,
            };
          } catch (error) {
            return {
              id: acc.id,
              name: acc.name,
              balance: 0,
            };
          }
        }),
      );

      const totalBalance = accountsWithBalance.reduce(
        (sum, acc) => sum + (acc.balance || 0),
        0,
      );

      return {
        accounts: accountsWithBalance,
        totalBalance,
      };
    } catch (error) {
      console.error('Error getting cash accounts balance:', error);
      return { accounts: [], totalBalance: 0 };
    }
  }

  private async getTotalReceivables(): Promise<number> {
    try {
      const invoices = await this.invoiceRepository.find();

      return invoices.reduce((sum, inv) => {
        const paid = inv.paidAmount || 0;
        return sum + ((inv.total || 0) - paid);
      }, 0);
    } catch (error) {
      console.error('Error getting total receivables:', error);
      return 0;
    }
  }

  private async getTotalPayables(): Promise<number> {
    try {
      const invoices = await this.supplierInvoiceRepository.find();

      return invoices.reduce((sum, inv) => {
        const paid = inv.paidAmount || 0;
        return sum + ((inv.total || 0) - paid);
      }, 0);
    } catch (error) {
      console.error('Error getting total payables:', error);
      return 0;
    }
  }
}

