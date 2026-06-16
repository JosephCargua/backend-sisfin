import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CashAccount } from '../entities/cash-account.entity';
import { CreateCashAccountDto } from '../dto/create-cash-account.dto';

@Injectable()
export class CashAccountService {
  constructor(
    @InjectRepository(CashAccount)
    private cashAccountRepository: Repository<CashAccount>,
    private dataSource: DataSource,
  ) {}

  async create(createCashAccountDto: CreateCashAccountDto): Promise<CashAccount> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existing = await queryRunner.manager.findOne(CashAccount, {
        where: { name: createCashAccountDto.name },
      });

      if (existing) {
        throw new BadRequestException('Cash account name already exists');
      }

      const cashAccount = queryRunner.manager.create(CashAccount, {
        ...createCashAccountDto,
      });

      const saved = await queryRunner.manager.save(cashAccount);
      await queryRunner.commitTransaction();
      return saved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(): Promise<CashAccount[]> {
    return this.cashAccountRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<CashAccount> {
    const cashAccount = await this.cashAccountRepository.findOne({
      where: { id },
    });

    if (!cashAccount) {
      throw new NotFoundException(`Cash account with ID ${id} not found`);
    }

    return cashAccount;
  }

  async deactivate(id: string): Promise<CashAccount> {
    const cashAccount = await this.findOne(id);
    cashAccount.isActive = false;
    return this.cashAccountRepository.save(cashAccount);
  }
}

