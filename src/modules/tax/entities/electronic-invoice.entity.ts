import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  AUTHORIZED = 'AUTHORIZED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

@Entity('electronic_invoices')
@Index(['accessKey'], { unique: true })
@Index(['invoiceNumber'])
@Index(['status'])
export class ElectronicInvoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 49, unique: true })
  accessKey: string;

  @Column({ type: 'varchar', length: 50 })
  invoiceNumber: string;

  @Column({ type: 'date' })
  issueDate: Date;

  @Column({ type: 'varchar', length: 13 })
  customerIdentification: string;

  @Column({ type: 'varchar', length: 200 })
  customerName: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  total: number;

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.DRAFT,
  })
  status: InvoiceStatus;

  @Column({ type: 'text', nullable: true })
  xmlContent: string | null;

  @Column({ type: 'text', nullable: true })
  signedXml: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  authorizationNumber: string | null;

  @Column({ type: 'timestamp', nullable: true })
  authorizationDate: Date | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  environment: string | null;

  @Column({ type: 'uuid', nullable: true })
  relatedInvoiceId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

