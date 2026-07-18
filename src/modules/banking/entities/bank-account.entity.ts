import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { CheckSequence } from './check-sequence.entity';

@Entity('bank_accounts')
export class BankAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  accountNumber: string;

  @Column({ type: 'varchar', length: 200 })
  bankName: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  accountType: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  checkFormat: string;

  @Column({ type: 'boolean', default: false })
  forCollectionFormat: boolean;

  @Column({ type: 'uuid' })
  accountId: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => CheckSequence, (sequence) => sequence.bankAccount, { cascade: true })
  checkSequences: CheckSequence[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

