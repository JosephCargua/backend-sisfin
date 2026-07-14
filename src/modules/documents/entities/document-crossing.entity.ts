import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { FinancialDocument } from './financial-document.entity';

@Entity('document_crossings')
export class DocumentCrossing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  sourceDocumentId: string; // The origin document (e.g. Anticipo)

  @Column({ type: 'uuid', nullable: true })
  targetDocumentId: string; // The destination document (e.g. Factura)

  @ManyToOne(() => FinancialDocument)
  @JoinColumn({ name: 'targetDocumentId' })
  targetDocument: FinancialDocument;

  @Column({ type: 'date' })
  crossingDate: Date;

  @Column({ type: 'varchar', length: 100 })
  transactionMethod: string; // 'Cheque propio', etc.

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;
}
