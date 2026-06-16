import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { DocumentReviewStatus } from '../enums/document-review-status.enum';
import { DocumentProcessingStatus } from '../enums/document-processing-status.enum';

@Entity('electronic_document_registrations')
@Index(['documentNumber'])
@Index(['supplierIdentification'])
@Index(['processingStatus'])
@Index(['reviewStatus'])
export class ElectronicDocumentRegistration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  issueDate: Date;

  @Column({ type: 'date', nullable: true })
  authorizationDate: Date | null;

  @Column({ type: 'varchar', length: 50 })
  documentNumber: string;

  @Column({ type: 'varchar', length: 200 })
  supplierName: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  supplierIdentification: string | null;

  @Column({ type: 'varchar', length: 10 })
  documentTypeCode: string;

  @Column({ type: 'varchar', length: 80 })
  documentLabel: string;

  @Column({
    type: 'enum',
    enum: DocumentReviewStatus,
    default: DocumentReviewStatus.PENDING_REVIEW,
  })
  reviewStatus: DocumentReviewStatus;

  @Column({
    type: 'enum',
    enum: DocumentProcessingStatus,
    default: DocumentProcessingStatus.PARTIAL,
  })
  processingStatus: DocumentProcessingStatus;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  fileName: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  mimeType: string | null;

  @Column({ type: 'text', nullable: true })
  xmlContent: string | null;

  @Column({ type: 'varchar', length: 49, nullable: true })
  accessKey: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  total: number | null;

  @Column({ type: 'int', default: 0 })
  itemCount: number;

  @Column({ type: 'uuid', nullable: true })
  payableAccountId: string | null;

  @Column({ type: 'uuid', nullable: true })
  tipAccountId: string | null;

  @Column({ type: 'uuid', nullable: true })
  costCenterId: string | null;

  @Column({ type: 'uuid', nullable: true })
  recurringAccountId: string | null;

  @Column({ type: 'boolean', default: false })
  useRecurringAccount: boolean;

  @Column({ type: 'varchar', length: 10, nullable: true })
  retentionIrCode: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  retentionIvaCode: string | null;

  @Column({ type: 'boolean', default: false })
  generateRetention: boolean;

  @Column({ type: 'boolean', default: false })
  updatePersonData: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
