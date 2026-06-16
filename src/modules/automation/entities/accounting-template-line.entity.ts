import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
} from 'typeorm';
import { AccountingTemplate } from './accounting-template.entity';

@Entity('accounting_template_lines')
export class AccountingTemplateLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  templateId: string;

  @ManyToOne(() => AccountingTemplate, (template) => template.lines, {
    onDelete: 'CASCADE',
  })
  template: AccountingTemplate;

  @Column({ type: 'uuid' })
  accountId: string;

  @Column({ type: 'varchar', length: 20 })
  side: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  formula: string | null;

  @Column({ type: 'int' })
  order: number;
}

