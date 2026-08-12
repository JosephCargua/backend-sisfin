import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('bank_reconciliations')
export class BankReconciliation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  bankAccountId: string;

  @Column({ type: 'date' })
  reconciliationDate: Date;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 50, default: 'Pendiente' })
  status: string; // 'Pendiente' | 'Concluida'

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  statementBalance: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  accountingBalance: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  initialBalance: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalIncomes: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalExpenses: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  reconciledBalance: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  difference: number;

  @CreateDateColumn()
  createdAt: Date;
}

