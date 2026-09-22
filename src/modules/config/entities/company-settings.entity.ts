import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('company_settings')
export class CompanySettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200, default: 'Empresa Demo' })
  companyName: string;

  @Column({ type: 'varchar', length: 20, default: '0000000000001' })
  ruc: string;

  @Column({ type: 'jsonb', nullable: true })
  signatures: any;

  @Column({ type: 'jsonb', nullable: true })
  defaultAccounts: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
