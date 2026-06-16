import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum RetentionType {
  SOURCE = 'SOURCE',
  IVA = 'IVA',
}

@Entity('retentions')
@Index(['accessKey'], { unique: true })
@Index(['documentNumber'])
export class Retention {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 49, unique: true })
  accessKey: string;

  @Column({ type: 'varchar', length: 50 })
  documentNumber: string;

  @Column({ type: 'date' })
  issueDate: Date;

  @Column({ type: 'varchar', length: 13 })
  supplierIdentification: string;

  @Column({ type: 'varchar', length: 200 })
  supplierName: string;

  @Column({
    type: 'enum',
    enum: RetentionType,
  })
  type: RetentionType;

  @Column({ type: 'varchar', length: 10 })
  retentionCode: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  baseAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  retentionRate: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  retentionAmount: number;

  @Column({ type: 'text', nullable: true })
  xmlContent: string | null;

  @Column({ type: 'text', nullable: true })
  signedXml: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  authorizationNumber: string | null;

  @Column({ type: 'timestamp', nullable: true })
  authorizationDate: Date | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  environment: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

