import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { FinancialDocumentPayment } from './payment.entity';
import { FinancialDocument } from '../../documents/entities/financial-document.entity';

@Entity('financial_document_payment_details')
export class PaymentDetail {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  paymentId: string;

  @ManyToOne(() => FinancialDocumentPayment, (payment) => payment.details)
  @JoinColumn({ name: 'paymentId' })
  payment: FinancialDocumentPayment;

  @Column({ type: 'uuid' })
  financialDocumentId: string;

  @ManyToOne(() => FinancialDocument)
  @JoinColumn({ name: 'financialDocumentId' })
  financialDocument: FinancialDocument;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amountToPay: number;
}
