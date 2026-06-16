import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PeriodLock } from '../entities/period-lock.entity';

@Injectable()
export class PeriodLockService {
  constructor(
    @InjectRepository(PeriodLock)
    private periodLockRepository: Repository<PeriodLock>,
    private dataSource: DataSource,
  ) {}

  async lockPeriod(year: number, month: number, userId?: string): Promise<PeriodLock> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (month < 1 || month > 12) {
        throw new BadRequestException('Invalid month');
      }

      let periodLock = await queryRunner.manager.findOne(PeriodLock, {
        where: { year, month },
      });

      if (periodLock) {
        if (periodLock.isLocked) {
          throw new BadRequestException('Period is already locked');
        }
        periodLock.isLocked = true;
        periodLock.lockedBy = userId || null;
        periodLock.lockedAt = new Date();
      } else {
        periodLock = queryRunner.manager.create(PeriodLock, {
          year,
          month,
          isLocked: true,
          lockedBy: userId || null,
          lockedAt: new Date(),
        });
      }

      const saved = await queryRunner.manager.save(periodLock);
      await queryRunner.commitTransaction();
      return saved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async unlockPeriod(year: number, month: number): Promise<PeriodLock> {
    const periodLock = await this.periodLockRepository.findOne({
      where: { year, month },
    });

    if (!periodLock) {
      throw new NotFoundException('Period lock not found');
    }

    if (!periodLock.isLocked) {
      throw new BadRequestException('Period is not locked');
    }

    periodLock.isLocked = false;
    periodLock.lockedBy = null;
    periodLock.lockedAt = null;

    return this.periodLockRepository.save(periodLock);
  }

  async isPeriodLocked(year: number, month: number): Promise<boolean> {
    const periodLock = await this.periodLockRepository.findOne({
      where: { year, month },
    });

    return periodLock?.isLocked ?? false;
  }

  async findAll(): Promise<PeriodLock[]> {
    return this.periodLockRepository.find({
      order: { year: 'DESC', month: 'DESC' },
    });
  }

  async checkPeriodLock(date: Date): Promise<void> {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    const isLocked = await this.isPeriodLocked(year, month);
    if (isLocked) {
      throw new BadRequestException(
        `Period ${year}-${String(month).padStart(2, '0')} is locked and cannot be modified`,
      );
    }
  }
}

