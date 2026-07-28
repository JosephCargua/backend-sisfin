import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BankTransaction } from '../entities/bank-transaction.entity';
import { BankTransactionDetail } from '../entities/bank-transaction-detail.entity';
import { BankAccount } from '../entities/bank-account.entity';
import { CreateBankTransactionDto } from '../dto/create-bank-transaction.dto';
import { JournalEntryLine } from '../../accounting/entities/journal-entry-line.entity';
import { JournalEntryStatus } from '../../accounting/enums/journal-entry-status.enum';

@Injectable()
export class BankTransactionService {
  constructor(
    @InjectRepository(BankTransaction)
    private bankTransactionRepository: Repository<BankTransaction>,
    @InjectRepository(BankAccount)
    private bankAccountRepository: Repository<BankAccount>,
    @InjectRepository(JournalEntryLine)
    private journalEntryLineRepository: Repository<JournalEntryLine>,
    private dataSource: DataSource,
  ) {}

  async create(
    createTransactionDto: CreateBankTransactionDto,
  ): Promise<BankTransaction> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const bankAccount = await queryRunner.manager.findOne(BankAccount, {
        where: { id: createTransactionDto.bankAccountId },
      });

      if (!bankAccount) {
        throw new NotFoundException('Bank account not found');
      }

      const transaction = queryRunner.manager.create(BankTransaction, {
        ...createTransactionDto,
        date: new Date(createTransactionDto.date),
        checkDate: createTransactionDto.checkDate ? new Date(createTransactionDto.checkDate) : undefined,
      });

      // Si hay detalles, mapéalos
      if (createTransactionDto.details && createTransactionDto.details.length > 0) {
        transaction.details = createTransactionDto.details.map(detailDto => {
          return queryRunner.manager.create(BankTransactionDetail, detailDto);
        });
      }

      const saved = await queryRunner.manager.save(transaction);
      await queryRunner.commitTransaction();
      return saved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findByBankAccount(bankAccountId: string): Promise<any[]> {
    const transactions = await this.bankTransactionRepository.find({
      where: { bankAccountId, isAnnulled: false },
      order: { date: 'DESC', createdAt: 'DESC' },
    });

    const journalLines = await this.journalEntryLineRepository.find({
      where: { accountId: bankAccountId },
      relations: ['journalEntry'],
    });

    const filteredJournalLines = journalLines.filter(line => line.journalEntry.status !== JournalEntryStatus.CANCELLED);

    const mappedJournalLines = filteredJournalLines.map(line => ({
      id: line.id,
      bankAccountId: line.accountId,
      date: line.journalEntry.date,
      description: line.description || line.journalEntry.description || 'Asiento Contable',
      amount: line.debit > 0 ? line.debit : line.credit,
      type: line.debit > 0 ? 'Ingreso' : 'Egreso',
      transactionType: 'Asiento Contable',
      paymentMethod: 'Caja/Banco',
      isAnnulled: false,
      personName: null,
      payToOrderOf: null,
      checkNumber: line.reference || line.journalEntry.reference,
      checkDate: null,
      bankReconciliationId: line.bankReconciliationId,
      createdAt: line.journalEntry.createdAt,
    }));

    const combined = [...transactions, ...mappedJournalLines];
    combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const uniqueCombined = [];
    const seen = new Set();
    for (const item of combined) {
      const desc = (item.description || item.transactionType || '').trim().toLowerCase();
      const amt = Number(item.amount).toFixed(2);
      const key = `${desc}-${amt}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueCombined.push(item);
      }
    }

    return uniqueCombined;
  }

  async getAccountStatement(
    bankAccountId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<any> {
    
    // Calcular Saldo Inicial (sumatoria histórica antes del startDate)
    let initialBalance = 0;
    if (startDate) {
      const prevTransactions = await this.bankTransactionRepository
        .createQueryBuilder('tx')
        .where('tx.bankAccountId = :bankAccountId', { bankAccountId })
        .andWhere('tx.date < :startDate', { startDate: new Date(startDate) })
        .getMany();
        
      initialBalance = prevTransactions.reduce((acc, tx) => {
        const amount = Number(tx.amount) || 0;
        if (tx.transactionType === 'Egreso' || tx.type === 'Egreso') {
          return acc - amount;
        } else {
          return acc + amount;
        }
      }, 0);

      const prevJournalLines = await this.journalEntryLineRepository
        .createQueryBuilder('line')
        .leftJoinAndSelect('line.journalEntry', 'je')
        .where('line.accountId = :bankAccountId', { bankAccountId })
        .andWhere('je.date < :startDate', { startDate: new Date(startDate) })
        .getMany();

      const journalBalance = prevJournalLines.reduce((acc, line) => {
        // Debit = Ingreso (increase balance), Credit = Egreso (decrease balance)
        const debit = Number(line.debit) || 0;
        const credit = Number(line.credit) || 0;
        return acc + debit - credit;
      }, 0);

      initialBalance += journalBalance;
    }

    const queryBuilder = this.bankTransactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.bankAccountId = :bankAccountId', { bankAccountId })
      .andWhere('transaction.isAnnulled = :isAnnulled', { isAnnulled: false });

    if (startDate) {
      queryBuilder.andWhere('transaction.date >= :startDate', {
        startDate: new Date(startDate),
      });
    }

    if (endDate) {
      queryBuilder.andWhere('transaction.date <= :endDate', {
        endDate: new Date(endDate),
      });
    }

    const transactions = await queryBuilder
      .orderBy('transaction.date', 'ASC')
      .addOrderBy('transaction.createdAt', 'ASC')
      .getMany();

    const journalQueryBuilder = this.journalEntryLineRepository
      .createQueryBuilder('line')
      .leftJoinAndSelect('line.journalEntry', 'je')
      .where('line.accountId = :bankAccountId', { bankAccountId })
      .andWhere('je.status != :status', { status: JournalEntryStatus.CANCELLED });

    if (startDate) {
      journalQueryBuilder.andWhere('je.date >= :startDate', {
        startDate: new Date(startDate),
      });
    }

    if (endDate) {
      journalQueryBuilder.andWhere('je.date <= :endDate', {
        endDate: new Date(endDate),
      });
    }

    const journalLines = await journalQueryBuilder.getMany();

    const mappedJournalLines = journalLines.map(line => ({
      id: line.id,
      bankAccountId: line.accountId,
      date: line.journalEntry.date,
      description: line.description || line.journalEntry.description || 'Asiento Contable',
      amount: line.debit > 0 ? line.debit : line.credit,
      type: line.debit > 0 ? 'Ingreso' : 'Egreso',
      transactionType: 'Asiento Contable',
      paymentMethod: 'Caja/Banco',
      isAnnulled: line.journalEntry.status === JournalEntryStatus.CANCELLED,
      personName: null,
      payToOrderOf: null,
      checkNumber: line.reference || line.journalEntry.reference,
      checkDate: null,
      bankReconciliationId: line.bankReconciliationId,
      createdAt: line.journalEntry.createdAt,
    }));

    const combined = [...transactions, ...mappedJournalLines];
    combined.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const uniqueCombined = [];
    const seen = new Set();
    for (const item of combined) {
      const desc = (item.description || item.transactionType || '').trim().toLowerCase();
      const amt = Number(item.amount).toFixed(2);
      const key = `${desc}-${amt}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueCombined.push(item);
      }
    }

    return {
      bankAccountId,
      startDate,
      endDate,
      initialBalance,
      transactions: uniqueCombined,
      count: uniqueCombined.length,
    };
  }

  async findAll(): Promise<BankTransaction[]> {
    return this.bankTransactionRepository.find({
      relations: ['details'],
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<BankTransaction> {
    const transaction = await this.bankTransactionRepository.findOne({
      where: { id },
      relations: ['details'],
    });
    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }
    return transaction;
  }

  async update(id: string, updateDto: CreateBankTransactionDto): Promise<BankTransaction> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existing = await queryRunner.manager.findOne(BankTransaction, {
        where: { id },
        relations: ['details'],
      });

      if (!existing) {
        throw new NotFoundException(`Transaction with ID ${id} not found`);
      }

      // Update basic fields
      queryRunner.manager.merge(BankTransaction, existing, {
        ...updateDto,
        date: new Date(updateDto.date),
        checkDate: updateDto.checkDate ? new Date(updateDto.checkDate) : undefined,
      });

      // Handle details
      if (updateDto.details) {
        // Remove existing details
        if (existing.details && existing.details.length > 0) {
          await queryRunner.manager.remove(existing.details);
        }
        
        // Add new details
        existing.details = updateDto.details.map(detailDto => {
          return queryRunner.manager.create(BankTransactionDetail, detailDto);
        });
      }

      const saved = await queryRunner.manager.save(existing);
      await queryRunner.commitTransaction();
      return saved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}

