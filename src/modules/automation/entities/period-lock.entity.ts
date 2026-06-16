import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm';

@Entity('period_locks')
@Index(['year', 'month'], { unique: true })
export class PeriodLock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'int' })
  month: number;

  @Column({ type: 'boolean', default: false })
  isLocked: boolean;

  @Column({ type: 'uuid', nullable: true })
  lockedBy: string | null;

  @Column({ type: 'timestamp', nullable: true })
  lockedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}

