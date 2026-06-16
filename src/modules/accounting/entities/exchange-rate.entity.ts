import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { Currency } from './currency.entity';

@Entity('exchange_rates')
@Index(['currencyId', 'date'], { unique: true })
export class ExchangeRate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  currencyId: string;

  @ManyToOne(() => Currency, { eager: true })
  currency: Currency;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'decimal', precision: 18, scale: 6 })
  rate: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;
}

