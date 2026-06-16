import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ElectronicDocumentRegistration } from './electronic-document-registration.entity';
import { LineMappingType } from '../enums/line-mapping-type.enum';

@Entity('electronic_document_line_items')
@Index(['documentRegistrationId'])
export class ElectronicDocumentLineItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  documentRegistrationId: string;

  @ManyToOne(() => ElectronicDocumentRegistration, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'documentRegistrationId' })
  document: ElectronicDocumentRegistration;

  @Column({ type: 'varchar', length: 50 })
  supplierCode: string;

  @Column({ type: 'varchar', length: 500 })
  supplierDescription: string;

  @Column({ type: 'varchar', length: 20 })
  ivaLabel: string;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  unitPrice: number;

  @Column({ type: 'boolean', default: false })
  isHomologated: boolean;

  @Column({ type: 'enum', enum: LineMappingType, nullable: true })
  mappingType: LineMappingType | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  internalCode: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  unit: string | null;

  @Column({ type: 'uuid', nullable: true })
  mappedProductId: string | null;

  @Column({ type: 'uuid', nullable: true })
  mappedAccountId: string | null;
}
