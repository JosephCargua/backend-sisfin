import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Account } from '../../accounting/entities/account.entity';
import { JournalEntryLine } from '../../accounting/entities/journal-entry-line.entity';
import { AccountType } from '../../accounting/enums/account-type.enum';
import { JournalEntryStatus } from '../../accounting/enums/journal-entry-status.enum';
import { JournalEntryService } from '../../accounting/services/journal-entry.service';
import {
  TrialBalanceNode,
  TrialBalanceReport,
} from '../interfaces/trial-balance-node.interface';
import { PdfGeneratorService } from './pdf-generator.service';
import { ExcelGeneratorService } from './excel-generator.service';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    @InjectRepository(JournalEntryLine)
    private journalEntryLineRepository: Repository<JournalEntryLine>,
    private journalEntryService: JournalEntryService,
    private pdfGeneratorService: PdfGeneratorService,
    private excelGeneratorService: ExcelGeneratorService,
    private dataSource: DataSource,
  ) {}

  async generateBalanceSheet(
    date: string,
    costCenterId?: string,
  ): Promise<any> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      if (!date) {
        throw new Error('Date is required');
      }

      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        throw new Error('Invalid date format');
      }

      const assets = await this.getAccountBalances(
        AccountType.ASSET,
        date,
        costCenterId,
        queryRunner,
      );
      const liabilities = await this.getAccountBalances(
        AccountType.LIABILITY,
        date,
        costCenterId,
        queryRunner,
      );
      const equity = await this.getAccountBalances(
        AccountType.EQUITY,
        date,
        costCenterId,
        queryRunner,
      );

      const totalAssets = assets.reduce((sum, acc) => sum + (acc.balance || 0), 0);
      const totalLiabilities = liabilities.reduce(
        (sum, acc) => sum + (acc.balance || 0),
        0,
      );
      const totalEquity = equity.reduce((sum, acc) => sum + (acc.balance || 0), 0);

      return {
        date,
        assets: assets || [],
        liabilities: liabilities || [],
        equity: equity || [],
        totalAssets,
        totalLiabilities,
        totalEquity,
      };
    } catch (error) {
      console.error('Error generating balance sheet:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async generateIncomeStatement(
    startDate: string,
    endDate: string,
    costCenterId?: string,
  ): Promise<any> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      if (!startDate || !endDate) {
        throw new Error('Start date and end date are required');
      }

      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);

      if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
        throw new Error('Invalid date format');
      }

      if (startDateObj > endDateObj) {
        throw new Error('Start date must be before or equal to end date');
      }

      const income = await this.getAccountBalances(
        AccountType.INCOME,
        endDate,
        costCenterId,
        queryRunner,
        startDate,
      );
      const expenses = await this.getAccountBalances(
        AccountType.EXPENSE,
        endDate,
        costCenterId,
        queryRunner,
        startDate,
      );

      const totalIncome = income.reduce((sum, acc) => sum + (acc.balance || 0), 0);
      const totalExpenses = expenses.reduce(
        (sum, acc) => sum + (acc.balance || 0),
        0,
      );

      return {
        startDate,
        endDate,
        income,
        expenses,
        totalIncome,
        totalExpenses,
      };
    } catch (error) {
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async generateTrialBalance(
    startDate: string,
    endDate: string,
    accountId?: string,
  ): Promise<TrialBalanceReport> {
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    const accounts = await this.accountRepository.find({
      where: { isActive: true },
      order: { code: 'ASC' },
    });

    let filteredAccounts = accounts;
    if (accountId) {
      const ids = this.collectSubtreeIds(accounts, accountId);
      filteredAccounts = accounts.filter((a) => ids.has(a.id));
    }

    const nodeMap = new Map<string, TrialBalanceNode>();

    for (const account of filteredAccounts) {
      const figures = await this.getAccountTrialFigures(
        account.id,
        account.type,
        startDate,
        endDate,
      );
      const { debtorBalance, creditorBalance } = this.splitBalance(
        figures.finalBalance,
        account.type,
      );

      nodeMap.set(account.id, {
        id: account.id,
        code: account.code,
        name: account.name,
        parentId: account.parentId,
        level: account.level,
        isControlAccount: account.isControlAccount,
        initialBalance: figures.initialBalance,
        periodDebit: figures.periodDebit,
        periodCredit: figures.periodCredit,
        debtorBalance,
        creditorBalance,
        children: [],
      });
    }

    const roots: TrialBalanceNode[] = [];
    for (const node of nodeMap.values()) {
      if (node.parentId && nodeMap.has(node.parentId)) {
        nodeMap.get(node.parentId)!.children.push(node);
      } else if (!node.parentId || !nodeMap.has(node.parentId)) {
        roots.push(node);
      }
    }

    const sortNodes = (nodes: TrialBalanceNode[]) => {
      nodes.sort((a, b) => a.code.localeCompare(b.code));
      nodes.forEach((n) => sortNodes(n.children));
    };
    sortNodes(roots);

    const rolledRoots = roots.map((r) => this.rollupTrialBalanceNode(r));

    const totals = rolledRoots.reduce(
      (acc, row) => ({
        initialBalance: acc.initialBalance + row.initialBalance,
        periodDebit: acc.periodDebit + row.periodDebit,
        periodCredit: acc.periodCredit + row.periodCredit,
        debtorBalance: acc.debtorBalance + row.debtorBalance,
        creditorBalance: acc.creditorBalance + row.creditorBalance,
      }),
      {
        initialBalance: 0,
        periodDebit: 0,
        periodCredit: 0,
        debtorBalance: 0,
        creditorBalance: 0,
      },
    );

    return {
      startDate,
      endDate,
      rows: rolledRoots,
      totals: this.roundTrialTotals(totals),
    };
  }

  async generateBalanceSheetPDF(date: string, costCenterId?: string): Promise<Buffer> {
    try {
      const data = await this.generateBalanceSheet(date, costCenterId);
      return await this.pdfGeneratorService.generateBalanceSheet(data);
    } catch (error) {
      console.error('Error generating balance sheet PDF:', error);
      throw error;
    }
  }

  async generateBalanceSheetExcel(date: string, costCenterId?: string): Promise<Buffer> {
    const data = await this.generateBalanceSheet(date, costCenterId);
    return this.excelGeneratorService.generateBalanceSheet(data);
  }

  async generateIncomeStatementPDF(
    startDate: string,
    endDate: string,
    costCenterId?: string,
    signatures?: any,
  ): Promise<Buffer> {
    const data = await this.generateIncomeStatement(startDate, endDate, costCenterId);
    if (signatures) {
      data.signatures = signatures;
    }
    return this.pdfGeneratorService.generateIncomeStatement(data);
  }

  async generateIncomeStatementExcel(
    startDate: string,
    endDate: string,
    costCenterId?: string,
  ): Promise<Buffer> {
    try {
      const data = await this.generateIncomeStatement(startDate, endDate, costCenterId);
      return await this.excelGeneratorService.generateIncomeStatement(data);
    } catch (error) {
      console.error('Error generating income statement Excel:', error);
      throw error;
    }
  }

  async generateGeneralLedgerPDF(
    accountId: string,
    startDate: string,
    endDate: string,
    costCenterId?: string,
  ): Promise<Buffer> {
    const data = await this.journalEntryService.getGeneralLedger(
      accountId,
      startDate,
      endDate,
      costCenterId,
    );
    return this.pdfGeneratorService.generateGeneralLedger(data);
  }

  async generateGeneralLedgerExcel(
    accountId: string,
    startDate: string,
    endDate: string,
    costCenterId?: string,
  ): Promise<Buffer> {
    const data = await this.journalEntryService.getGeneralLedger(
      accountId,
      startDate,
      endDate,
      costCenterId,
    );
    return this.excelGeneratorService.generateGeneralLedger(data);
  }

  private async getAccountTrialFigures(
    accountId: string,
    accountType: AccountType,
    startDate: string,
    endDate: string,
  ) {
    const before = await this.journalEntryLineRepository
      .createQueryBuilder('line')
      .innerJoin('line.journalEntry', 'entry')
      .where('line.accountId = :accountId', { accountId })
      .andWhere('entry.status = :status', { status: JournalEntryStatus.POSTED })
      .andWhere('entry.date < :startDate', { startDate })
      .select('COALESCE(SUM(line.debit), 0)', 'debit')
      .addSelect('COALESCE(SUM(line.credit), 0)', 'credit')
      .getRawOne();

    const period = await this.journalEntryLineRepository
      .createQueryBuilder('line')
      .innerJoin('line.journalEntry', 'entry')
      .where('line.accountId = :accountId', { accountId })
      .andWhere('entry.status = :status', { status: JournalEntryStatus.POSTED })
      .andWhere('entry.date >= :startDate', { startDate })
      .andWhere('entry.date <= :endDate', { endDate })
      .select('COALESCE(SUM(line.debit), 0)', 'debit')
      .addSelect('COALESCE(SUM(line.credit), 0)', 'credit')
      .getRawOne();

    const beforeDebit = parseFloat(before?.debit ?? '0');
    const beforeCredit = parseFloat(before?.credit ?? '0');
    const periodDebit = parseFloat(period?.debit ?? '0');
    const periodCredit = parseFloat(period?.credit ?? '0');

    const initialBalance = this.netBalance(
      beforeDebit,
      beforeCredit,
      accountType,
    );
    const finalBalance =
      initialBalance +
      this.netBalance(periodDebit, periodCredit, accountType);

    return {
      initialBalance: Math.round(initialBalance * 100) / 100,
      periodDebit: Math.round(periodDebit * 100) / 100,
      periodCredit: Math.round(periodCredit * 100) / 100,
      finalBalance: Math.round(finalBalance * 100) / 100,
    };
  }

  private netBalance(
    debit: number,
    credit: number,
    accountType: AccountType,
  ): number {
    const isDebitNature =
      accountType === AccountType.ASSET || accountType === AccountType.EXPENSE;
    return isDebitNature ? debit - credit : credit - debit;
  }

  private splitBalance(balance: number, accountType: AccountType) {
    const abs = Math.abs(balance);
    if (abs < 0.005) {
      return { debtorBalance: 0, creditorBalance: 0 };
    }
    const isDebitNature =
      accountType === AccountType.ASSET || accountType === AccountType.EXPENSE;
    if (isDebitNature) {
      return balance >= 0
        ? { debtorBalance: abs, creditorBalance: 0 }
        : { debtorBalance: 0, creditorBalance: abs };
    }
    return balance >= 0
      ? { debtorBalance: 0, creditorBalance: abs }
      : { debtorBalance: abs, creditorBalance: 0 };
  }

  private rollupTrialBalanceNode(node: TrialBalanceNode): TrialBalanceNode {
    if (node.children.length > 0) {
      node.children = node.children.map((c) => this.rollupTrialBalanceNode(c));
      node.initialBalance = 0;
      node.periodDebit = 0;
      node.periodCredit = 0;
      node.debtorBalance = 0;
      node.creditorBalance = 0;
      for (const child of node.children) {
        node.initialBalance += child.initialBalance;
        node.periodDebit += child.periodDebit;
        node.periodCredit += child.periodCredit;
        node.debtorBalance += child.debtorBalance;
        node.creditorBalance += child.creditorBalance;
      }
      node.initialBalance = Math.round(node.initialBalance * 100) / 100;
      node.periodDebit = Math.round(node.periodDebit * 100) / 100;
      node.periodCredit = Math.round(node.periodCredit * 100) / 100;
      node.debtorBalance = Math.round(node.debtorBalance * 100) / 100;
      node.creditorBalance = Math.round(node.creditorBalance * 100) / 100;
    }
    return node;
  }

  private collectSubtreeIds(
    accounts: Account[],
    rootId: string,
  ): Set<string> {
    const ids = new Set<string>();
    const collect = (id: string) => {
      ids.add(id);
      accounts
        .filter((a) => a.parentId === id)
        .forEach((child) => collect(child.id));
    };
    collect(rootId);
    return ids;
  }

  private roundTrialTotals(totals: TrialBalanceReport['totals']) {
    return {
      initialBalance: Math.round(totals.initialBalance * 100) / 100,
      periodDebit: Math.round(totals.periodDebit * 100) / 100,
      periodCredit: Math.round(totals.periodCredit * 100) / 100,
      debtorBalance: Math.round(totals.debtorBalance * 100) / 100,
      creditorBalance: Math.round(totals.creditorBalance * 100) / 100,
    };
  }

  private async getAccountBalances(
    type: AccountType,
    endDate: string,
    costCenterId: string | undefined,
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
              costCenterId,
            );
            return {
              code: account.code,
              accountName: account.name,
              balance: ledger.finalBalance || 0,
            };
          } catch (error) {
            // Si hay error al obtener el libro mayor, retornar balance 0
            console.error(`Error getting ledger for account ${account.id}:`, error);
            return {
              code: account.code,
              accountName: account.name,
              balance: 0,
            };
          }
        }),
      );

      return balances.filter((b) => b.balance !== 0);
    } catch (error) {
      console.error('Error in getAccountBalances:', error);
      throw error;
    }
  }
}
