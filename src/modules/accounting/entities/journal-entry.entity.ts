import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { JournalEntryLine } from './journal-entry-line.entity';
import { JournalEntryStatus } from '../enums/journal-entry-status.enum';

@Entity('journal_entries')
@Index(['entryNumber'], { unique: true })
@Index(['date'])
@Index(['status'])
export class JournalEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  entryNumber: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: JournalEntryStatus,
    default: JournalEntryStatus.DRAFT,
  })
  status: JournalEntryStatus;

  @Column({ type: 'uuid', nullable: true })
  currencyId: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalDebit: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalCredit: number;

  @Column({ type: 'uuid', nullable: true })
  costCenterId: string | null;

  @Column({ type: 'text', nullable: true })
  reference: string | null;

  @Column({ type: 'text', nullable: true })
  cancellationReason: string | null;

  @Column({ type: 'uuid', nullable: true })
  cancelledBy: string | null;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date | null;

  @OneToMany(() => JournalEntryLine, (line) => line.journalEntry, {
    cascade: true,
    eager: false,
  })
  lines: JournalEntryLine[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  createdBy: string | null;

  @Column({ type: 'uuid', nullable: true })
  updatedBy: string | null;
}

