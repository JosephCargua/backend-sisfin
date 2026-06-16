import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import Decimal from 'decimal.js';
import { JournalEntry } from '../entities/journal-entry.entity';
import { JournalEntryLine } from '../entities/journal-entry-line.entity';
import { CreateJournalEntryDto } from '../dto/create-journal-entry.dto';
import { JournalEntryLineDto } from '../dto/journal-entry-line.dto';
import { JournalEntryStatus } from '../enums/journal-entry-status.enum';
import { AccountType } from '../enums/account-type.enum';
import { Account } from '../entities/account.entity';

@Injectable()
export class JournalEntryService {
  constructor(
    @InjectRepository(JournalEntry)
    private journalEntryRepository: Repository<JournalEntry>,
    @InjectRepository(JournalEntryLine)
    private journalEntryLineRepository: Repository<JournalEntryLine>,
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    private dataSource: DataSource,
  ) {}

  async create(
    createJournalEntryDto: CreateJournalEntryDto,
    userId?: string,
  ): Promise<JournalEntry> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.validateDoubleEntry(createJournalEntryDto.lines);

      const entryNumber = await this.generateEntryNumber(
        createJournalEntryDto.date,
        queryRunner,
      );

      const totalDebit = createJournalEntryDto.lines.reduce(
        (sum, line) => new Decimal(sum).plus(line.debit).toNumber(),
        0,
      );

      const totalCredit = createJournalEntryDto.lines.reduce(
        (sum, line) => new Decimal(sum).plus(line.credit).toNumber(),
        0,
      );

      const journalEntry = queryRunner.manager.create(JournalEntry, {
        entryNumber,
        date: new Date(createJournalEntryDto.date),
        description: createJournalEntryDto.description,
        currencyId: createJournalEntryDto.currencyId,
        costCenterId: createJournalEntryDto.costCenterId,
        reference: createJournalEntryDto.reference,
        totalDebit,
        totalCredit,
        status: JournalEntryStatus.DRAFT,
        createdBy: userId,
      });

      const savedEntry = await queryRunner.manager.save(journalEntry);

      const lines = createJournalEntryDto.lines.map((line) =>
        queryRunner.manager.create(JournalEntryLine, {
          ...line,
          journalEntryId: savedEntry.id,
        }),
      );

      await queryRunner.manager.save(lines);

      await queryRunner.commitTransaction();

      return this.findOne(savedEntry.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async post(id: string, userId?: string): Promise<JournalEntry> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const entry = await queryRunner.manager.findOne(JournalEntry, {
        where: { id },
        relations: ['lines'],
      });

      if (!entry) {
        throw new NotFoundException(`Journal entry with ID ${id} not found`);
      }

      if (entry.status === JournalEntryStatus.CANCELLED) {
        throw new BadRequestException('Cannot post a cancelled entry');
      }

      if (entry.status === JournalEntryStatus.POSTED) {
        throw new BadRequestException('Entry is already posted');
      }

      this.validateDoubleEntry(entry.lines);

      await queryRunner.manager.update(JournalEntry, id, {
        status: JournalEntryStatus.POSTED,
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

  async cancel(
    id: string,
    reason: string,
    userId?: string,
  ): Promise<JournalEntry> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const entry = await queryRunner.manager.findOne(JournalEntry, {
        where: { id },
      });

      if (!entry) {
        throw new NotFoundException(`Journal entry with ID ${id} not found`);
      }

      if (entry.status === JournalEntryStatus.CANCELLED) {
        throw new BadRequestException('Entry is already cancelled');
      }

      await queryRunner.manager.update(JournalEntry, id, {
        status: JournalEntryStatus.CANCELLED,
        cancellationReason: reason,
        cancelledBy: userId,
        cancelledAt: new Date(),
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

  async findOne(id: string): Promise<JournalEntry> {
    const entry = await this.journalEntryRepository.findOne({
      where: { id },
      relations: ['lines', 'lines.account'],
    });

    if (!entry) {
      throw new NotFoundException(`Journal entry with ID ${id} not found`);
    }

    return entry;
  }

  async findAll(
    startDate?: string,
    endDate?: string,
    status?: JournalEntryStatus,
  ): Promise<JournalEntry[]> {
    const queryBuilder =
      this.journalEntryRepository.createQueryBuilder('entry');

    if (startDate) {
      queryBuilder.andWhere('entry.date >= :startDate', {
        startDate: new Date(startDate),
      });
    }

    if (endDate) {
      queryBuilder.andWhere('entry.date <= :endDate', {
        endDate: new Date(endDate),
      });
    }

    if (status) {
      queryBuilder.andWhere('entry.status = :status', { status });
    }

    return queryBuilder
      .leftJoinAndSelect('entry.lines', 'lines')
      .leftJoinAndSelect('lines.account', 'account')
      .orderBy('entry.date', 'DESC')
      .addOrderBy('entry.entryNumber', 'DESC')
      .getMany();
  }

  async getGeneralLedger(
    accountId: string,
    startDate: string,
    endDate: string,
    costCenterId?: string,
  ) {
    try {
      if (!accountId) {
        throw new BadRequestException('Account ID is required');
      }

      if (!startDate || !endDate) {
        throw new BadRequestException('Start date and end date are required');
      }

      const account = await this.accountRepository.findOne({
        where: { id: accountId },
      });

      if (!account) {
        throw new NotFoundException(`Account with ID ${accountId} not found`);
      }

      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);

      if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
        throw new BadRequestException('Invalid date format');
      }

      if (startDateObj > endDateObj) {
        throw new BadRequestException('Start date must be before or equal to end date');
      }

      const queryBuilder = this.journalEntryLineRepository
        .createQueryBuilder('line')
        .leftJoinAndSelect('line.journalEntry', 'entry')
        .where('line.accountId = :accountId', { accountId })
        .andWhere('entry.date >= :startDate', { startDate: startDateObj })
        .andWhere('entry.date <= :endDate', { endDate: endDateObj })
        .andWhere('entry.status = :status', {
          status: JournalEntryStatus.POSTED,
        });

      if (costCenterId) {
        queryBuilder.andWhere('line.costCenterId = :costCenterId', {
          costCenterId,
        });
      }

      const lines = await queryBuilder
        .orderBy('entry.date', 'ASC')
        .addOrderBy('entry.entryNumber', 'ASC')
        .getMany();

      let runningBalance = new Decimal(0);

      const movements = lines.map((line) => {
        const debit = new Decimal(line.debit || 0);
        const credit = new Decimal(line.credit || 0);

        if (account.type === AccountType.ASSET || account.type === AccountType.EXPENSE) {
          runningBalance = runningBalance.plus(debit).minus(credit);
        } else {
          runningBalance = runningBalance.plus(credit).minus(debit);
        }

        return {
          id: line.id,
          journalEntryId: line.journalEntryId,
          accountId: line.accountId,
          debit: debit.toNumber(),
          credit: credit.toNumber(),
          description: line.description,
          costCenterId: line.costCenterId,
          reference: line.reference,
          journalEntry: line.journalEntry,
          balance: runningBalance.toNumber(),
        };
      });

      return {
        account,
        startDate,
        endDate,
        movements,
        finalBalance: movements.length > 0 ? movements[movements.length - 1].balance : 0,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Error generating general ledger: ${error.message || 'Unknown error'}`,
      );
    }
  }

  private validateDoubleEntry(lines: JournalEntryLineDto[] | JournalEntryLine[]): void {
    const totalDebit = lines.reduce(
      (sum: number, line) => {
        const debit = line instanceof JournalEntryLine ? line.debit : (line as JournalEntryLineDto).debit;
        return new Decimal(sum).plus(debit).toNumber();
      },
      0,
    );

    const totalCredit = lines.reduce(
      (sum: number, line) => {
        const credit = line instanceof JournalEntryLine ? line.credit : (line as JournalEntryLineDto).credit;
        return new Decimal(sum).plus(credit).toNumber();
      },
      0,
    );

    const difference = Math.abs(new Decimal(totalDebit).minus(totalCredit).toNumber());

    if (difference > 0.01) {
      throw new BadRequestException(
        `Double entry validation failed. Difference: ${difference.toFixed(2)}`,
      );
    }

    if (lines.length < 2) {
      throw new BadRequestException(
        'Journal entry must have at least two lines',
      );
    }
  }

  private async generateEntryNumber(
    date: Date | string,
    queryRunner: any,
  ): Promise<string> {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');

    const lastEntry = await queryRunner.manager
      .createQueryBuilder(JournalEntry, 'entry')
      .where('entry.entryNumber LIKE :pattern', {
        pattern: `JE-${year}${month}-%`,
      })
      .orderBy('entry.entryNumber', 'DESC')
      .getOne();

    let sequence = 1;

    if (lastEntry) {
      const parts = lastEntry.entryNumber.split('-');
      const lastSequence = parseInt(parts[parts.length - 1], 10);
      sequence = lastSequence + 1;
    }

    return `JE-${year}${month}-${String(sequence).padStart(6, '0')}`;
  }
}

