import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BankTransaction } from './bank-transaction.entity';

@Entity('bank_transaction_details')
export class BankTransactionDetail {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  bankTransactionId: string;

  @Column({ type: 'varchar', length: 150 })
  accountName: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  costCenter: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  project: string;

  @ManyToOne(() => BankTransaction, (transaction) => transaction.details, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'bankTransactionId' })
  bankTransaction: BankTransaction;
}
