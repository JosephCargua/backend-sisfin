import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { FinancialDocumentLineType } from '../enums/financial-document-line-type.enum';
import { FinancialDocument } from './financial-document.entity';

@Entity('financial_document_lines')
export class FinancialDocumentLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  documentId: string;

  @ManyToOne(() => FinancialDocument, (doc) => doc.lines, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'documentId' })
  document: FinancialDocument;

  @Column({ type: 'enum', enum: FinancialDocumentLineType })
  lineType: FinancialDocumentLineType;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'jsonb', default: {} })
  data: Record<string, unknown>;
}
