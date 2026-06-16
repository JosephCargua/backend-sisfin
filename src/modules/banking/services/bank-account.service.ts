import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BankAccount } from '../entities/bank-account.entity';
import { CreateBankAccountDto } from '../dto/create-bank-account.dto';

@Injectable()
export class BankAccountService {
  constructor(
    @InjectRepository(BankAccount)
    private bankAccountRepository: Repository<BankAccount>,
    private dataSource: DataSource,
  ) {}

  async create(createBankAccountDto: CreateBankAccountDto): Promise<BankAccount> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existing = await queryRunner.manager.findOne(BankAccount, {
        where: { accountNumber: createBankAccountDto.accountNumber },
      });

      if (existing) {
        throw new BadRequestException('Bank account number already exists');
      }

      const bankAccount = queryRunner.manager.create(BankAccount, {
        ...createBankAccountDto,
      });

      const saved = await queryRunner.manager.save(bankAccount);
      await queryRunner.commitTransaction();
      return saved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(): Promise<BankAccount[]> {
    return this.bankAccountRepository.find({
      where: { isActive: true },
      order: { bankName: 'ASC', accountNumber: 'ASC' },
    });
  }

  async findOne(id: string): Promise<BankAccount> {
    const bankAccount = await this.bankAccountRepository.findOne({
      where: { id },
    });

    if (!bankAccount) {
      throw new NotFoundException(`Bank account with ID ${id} not found`);
    }

    return bankAccount;
  }

  async deactivate(id: string): Promise<BankAccount> {
    const bankAccount = await this.findOne(id);
    bankAccount.isActive = false;
    return this.bankAccountRepository.save(bankAccount);
  }
}

