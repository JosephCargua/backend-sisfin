import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { DocumentPersonType } from '../enums/document-person-type.enum';
import { DocumentCategory } from '../enums/document-category.enum';
import { DocumentEntryType } from '../enums/document-entry-type.enum';
import { FinancialDocumentLine } from './financial-document-line.entity';

@Entity('financial_documents')
@Index(['documentNumber'])
@Index(['issueDate'])
export class FinancialDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  issueDate: Date;

  @Column({ type: 'enum', enum: DocumentPersonType })
  personType: DocumentPersonType;

  @Column({ type: 'enum', enum: DocumentCategory, default: DocumentCategory.INVOICE })
  documentCategory: DocumentCategory;

  @Column({
    type: 'enum',
    enum: DocumentEntryType,
    default: DocumentEntryType.NON_ELECTRONIC,
  })
  entryType: DocumentEntryType;

  @Column({ type: 'varchar', length: 50 })
  documentNumber: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  authorization: string | null;

  @Column({ type: 'uuid', nullable: true })
  personId: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  personName: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  personIdentification: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference: string | null;

  @Column({ type: 'int', default: 0 })
  dueDays: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  purchaseOrderRef: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  seller: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: false })
  payWithPettyCash: boolean;

  @Column({ type: 'uuid', nullable: true })
  pettyCashAccountId: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  subtotal15: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  subtotal5: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  subtotal0: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  iva15: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  iva5: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  ice: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  total: number;

  @OneToMany(() => FinancialDocumentLine, (line) => line.document, {
    cascade: true,
    eager: true,
  })
  lines: FinancialDocumentLine[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
