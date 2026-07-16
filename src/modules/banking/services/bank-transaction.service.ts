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

