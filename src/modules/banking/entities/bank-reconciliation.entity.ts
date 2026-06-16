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

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  statementBalance: number;

  @CreateDateColumn()
  createdAt: Date;
}

