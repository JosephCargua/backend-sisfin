import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum DocumentPaymentType {
  ELECTRONIC = 'ELECTRONIC',
  FINANCIAL = 'FINANCIAL',
}

export enum PaymentTransactionType {
  BANK = 'bank',
  JOURNAL = 'journal',
  CROSSING = 'crossing',
}

@Entity('document_payments')
@Index(['documentId'])
export class DocumentPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  documentId: string;

  @Column({
    type: 'enum',
    enum: DocumentPaymentType,
  })
  documentType: DocumentPaymentType;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: PaymentTransactionType,
  })
  transactionType: PaymentTransactionType;

  @Column({ type: 'varchar', length: 50 })
  transactionId: string;

  @CreateDateColumn()
  createdAt: Date;
}
