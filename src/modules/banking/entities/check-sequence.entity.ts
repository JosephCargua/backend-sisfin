import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { BankAccount } from './bank-account.entity';

@Entity('check_sequences')
export class CheckSequence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  startSequence: string;

  @Column({ type: 'varchar', length: 50 })
  endSequence: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'uuid' })
  bankAccountId: string;

  @ManyToOne(() => BankAccount, (bankAccount) => bankAccount.checkSequences, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bankAccountId' })
  bankAccount: BankAccount;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
