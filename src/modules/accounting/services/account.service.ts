import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { Account } from '../entities/account.entity';
import { CreateAccountDto } from '../dto/create-account.dto';

@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    private dataSource: DataSource,
  ) {}

  async create(createAccountDto: CreateAccountDto, userId?: string): Promise<Account> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (createAccountDto.parentId) {
        const parent = await queryRunner.manager.findOne(Account, {
          where: { id: createAccountDto.parentId },
        });

        if (!parent) {
          throw new NotFoundException('Parent account not found');
        }

        if (parent.isControlAccount === false) {
          throw new BadRequestException(
            'Cannot create child account under a movement account',
          );
        }
      }

      const existingAccount = await queryRunner.manager.findOne(Account, {
        where: { code: createAccountDto.code },
      });

      if (existingAccount) {
        throw new BadRequestException('Account code already exists');
      }

      const level = createAccountDto.parentId
        ? await this.calculateLevel(createAccountDto.parentId, queryRunner)
        : 1;

      const account = queryRunner.manager.create(Account, {
        ...createAccountDto,
        level,
        createdBy: userId,
      });

      const savedAccount = await queryRunner.manager.save(account);

      if (savedAccount.parentId) {
        await queryRunner.manager.update(Account, savedAccount.parentId, {
          isControlAccount: true,
        });
      }

      await queryRunner.commitTransaction();
      return savedAccount;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(): Promise<Account[]> {
    return this.accountRepository.find({
      where: { isActive: true },
      relations: ['parent'],
      order: { code: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Account> {
    const account = await this.accountRepository.findOne({
      where: { id },
      relations: ['parent', 'children'],
    });

    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }

    return account;
  }

  async findByCode(code: string): Promise<Account> {
    const account = await this.accountRepository.findOne({
      where: { code },
    });

    if (!account) {
      throw new NotFoundException(`Account with code ${code} not found`);
    }

    return account;
  }

  async getHierarchy(): Promise<Account[]> {
    const accounts = await this.accountRepository.find({
      where: { isActive: true, parentId: IsNull() },
      relations: ['children'],
      order: { code: 'ASC' },
    });

    return this.buildHierarchy(accounts);
  }

  private async buildHierarchy(accounts: Account[]): Promise<Account[]> {
    for (const account of accounts) {
      if (account.children && account.children.length > 0) {
        account.children = await this.buildHierarchy(account.children);
      }
    }
    return accounts;
  }

  async deactivate(id: string, userId?: string): Promise<Account> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const account = await queryRunner.manager.findOne(Account, {
        where: { id },
        relations: ['children'],
      });

      if (!account) {
        throw new NotFoundException(`Account with ID ${id} not found`);
      }

      // Verificar si tiene cuentas hijas activas
      const activeChildren = account.children?.filter((child) => child.isActive);
      if (activeChildren && activeChildren.length > 0) {
        throw new BadRequestException(
          `Cannot deactivate account with active child accounts. Deactivate ${activeChildren.length} child account(s) first.`,
        );
      }

      // Verificar si tiene movimientos en asientos posteados
      const { JournalEntryLine } = await import('../entities/journal-entry-line.entity');
      const { JournalEntryStatus } = await import('../enums/journal-entry-status.enum');
      
      const hasMovements = await queryRunner.manager
        .createQueryBuilder(JournalEntryLine, 'line')
        .innerJoin('line.journalEntry', 'entry')
        .where('line.accountId = :accountId', { accountId: id })
        .andWhere('entry.status = :status', { status: JournalEntryStatus.POSTED })
        .getCount();

      if (hasMovements > 0) {
        throw new BadRequestException(
          `Cannot deactivate account with posted journal entries. This account has ${hasMovements} movement(s) in posted entries.`,
        );
      }

      await queryRunner.manager.update(Account, id, {
        isActive: false,
        updatedBy: userId,
      });

      await queryRunner.commitTransaction();

      return this.findOne(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async activate(id: string, userId?: string): Promise<Account> {
    const account = await this.accountRepository.findOne({
      where: { id },
    });

    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }

    await this.accountRepository.update(id, {
      isActive: true,
      updatedBy: userId,
    });

    return this.findOne(id);
  }

  private async calculateLevel(
    parentId: string,
    queryRunner: any,
  ): Promise<number> {
    const parent = await queryRunner.manager.findOne(Account, {
      where: { id: parentId },
    });

    if (!parent) {
      return 1;
    }

    return parent.level + 1;
  }
}

