import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm';

export enum ATSStatus {
  DRAFT = 'DRAFT',
  GENERATED = 'GENERATED',
  SUBMITTED = 'SUBMITTED',
}

@Entity('ats')
@Index(['year', 'month'], { unique: true })
export class ATS {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'int' })
  month: number;

  @Column({
    type: 'enum',
    enum: ATSStatus,
    default: ATSStatus.DRAFT,
  })
  status: ATSStatus;

  @Column({ type: 'text', nullable: true })
  xmlContent: string | null;

  @Column({ type: 'timestamp', nullable: true })
  submittedAt: Date | null;

  @Column({ type: 'int', default: 0 })
  totalInvoices: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalAmount: number;

  @CreateDateColumn()
  createdAt: Date;
}

