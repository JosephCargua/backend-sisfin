import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { PaymentDetail } from './payment-detail.entity';

@Entity('financial_document_payments')
export class FinancialDocumentPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  type: string; // 'Pago' or 'Cobro'

  @Column({ type: 'varchar', length: 50 })
  paymentMethod: string; // 'Cheque', 'Transferencia', 'Caja', etc.

  @Column({ type: 'varchar', length: 50, nullable: true })
  subMethod: string; // 'Cheque propio', etc.

  @Column({ type: 'date' })
  issueDate: Date;

  @Column({ type: 'uuid', nullable: true })
  personId: string; // References the supplier or customer

  @Column({ type: 'varchar', length: 200, nullable: true })
  personName: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  payToOrderOf: string;

  @Column({ type: 'uuid', nullable: true })
  bankAccountId: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  checkNumber: string; // Or voucher number

  @Column({ type: 'boolean', default: false })
  isCash: boolean; // EFECTIVO checkbox

  @Column({ type: 'date', nullable: true })
  checkDate: Date;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: 'boolean', default: false })
  isAnnulled: boolean;

  @OneToMany(() => PaymentDetail, (detail) => detail.payment, {
    cascade: true,
  })
  details: PaymentDetail[];

  @CreateDateColumn()
  createdAt: Date;
}
