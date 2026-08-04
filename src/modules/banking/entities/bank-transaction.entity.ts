import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { BankTransactionDetail } from './bank-transaction-detail.entity';

@Entity('bank_transactions')
export class BankTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  bankAccountId: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'varchar', length: 200, nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 20 })
  type: string;

  // Nuevos campos según frontend
  @Column({ type: 'varchar', length: 20, nullable: true })
  transactionType: string; // Egreso / Ingreso

  @Column({ type: 'varchar', length: 50, nullable: true })
  paymentMethod: string; // Cheque, Depósito, Transferencia

  @Column({ type: 'boolean', default: false })
  isAnnulled: boolean;

  @Column({ type: 'uuid', nullable: true })
  personaId: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  personName: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  payToOrderOf: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  checkNumber: string;

  @Column({ type: 'date', nullable: true })
  checkDate: Date | null;

  @OneToMany(() => BankTransactionDetail, (detail) => detail.bankTransaction, {
    cascade: true,
  })
  details: BankTransactionDetail[];

  @Column({ type: 'uuid', nullable: true })
  bankReconciliationId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
