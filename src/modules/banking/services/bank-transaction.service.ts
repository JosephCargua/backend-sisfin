import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BankTransaction } from '../entities/bank-transaction.entity';
import { BankAccount } from '../entities/bank-account.entity';
import { CreateBankTransactionDto } from '../dto/create-bank-transaction.dto';

@Injectable()
export class BankTransactionService {
  constructor(
    @InjectRepository(BankTransaction)
    private bankTransactionRepository: Repository<BankTransaction>,
    @InjectRepository(BankAccount)
    private bankAccountRepository: Repository<BankAccount>,
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
      });

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

  async findByBankAccount(bankAccountId: string): Promise<BankTransaction[]> {
    return this.bankTransactionRepository.find({
      where: { bankAccountId },
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  async getAccountStatement(
    bankAccountId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<any> {
    const queryBuilder = this.bankTransactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.bankAccountId = :bankAccountId', { bankAccountId });

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

    return {
      bankAccountId,
      startDate,
      endDate,
      transactions,
      count: transactions.length,
    };
  }
}

