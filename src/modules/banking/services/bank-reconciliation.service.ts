import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { BankReconciliation } from '../entities/bank-reconciliation.entity';
import { BankTransaction } from '../entities/bank-transaction.entity';
import { CreateBankReconciliationDto } from '../dto/create-bank-reconciliation.dto';
import { PdfGeneratorService } from '../../reports/services/pdf-generator.service';
import { BankAccount } from '../entities/bank-account.entity';

@Injectable()
export class BankReconciliationService {
  constructor(
    @InjectRepository(BankReconciliation)
    private readonly bankReconciliationRepository: Repository<BankReconciliation>,
    @InjectRepository(BankTransaction)
    private readonly bankTransactionRepository: Repository<BankTransaction>,
    @InjectRepository(BankAccount)
    private readonly bankAccountRepository: Repository<BankAccount>,
    private readonly pdfGeneratorService: PdfGeneratorService,
  ) {}

  async create(createDto: CreateBankReconciliationDto): Promise<BankReconciliation> {
    const reconciliation = this.bankReconciliationRepository.create({
      bankAccountId: createDto.bankAccountId,
      reconciliationDate: new Date(createDto.reconciliationDate),
      description: createDto.description,
      status: createDto.status || 'Pendiente',
      statementBalance: createDto.statementBalance,
      accountingBalance: createDto.accountingBalance || 0,
      difference: createDto.difference || 0,
    });

    const saved = await this.bankReconciliationRepository.save(reconciliation);

    if (createDto.transactionIds && createDto.transactionIds.length > 0) {
      await this.bankTransactionRepository.update(
        { id: In(createDto.transactionIds) },
        { bankReconciliationId: saved.id }
      );
    }

    return saved;
  }

  async findAll(): Promise<BankReconciliation[]> {
    return this.bankReconciliationRepository.find({
      order: { reconciliationDate: 'DESC' },
    });
  }

  async findOne(id: string): Promise<BankReconciliation> {
    const recon = await this.bankReconciliationRepository.findOne({ where: { id } });
    if (!recon) {
      throw new NotFoundException(`Reconciliation with ID ${id} not found`);
    }
    return recon;
  }

  async update(id: string, updateDto: any): Promise<BankReconciliation> {
    const recon = await this.findOne(id);
    
    // Unlink old transactions if new ones are provided
    if (updateDto.transactionIds) {
      await this.bankTransactionRepository.update(
        { bankReconciliationId: id },
        { bankReconciliationId: null }
      );
      
      if (updateDto.transactionIds.length > 0) {
        await this.bankTransactionRepository.update(
          { id: In(updateDto.transactionIds) },
          { bankReconciliationId: id }
        );
      }
    }

    Object.assign(recon, {
      ...updateDto,
      reconciliationDate: updateDto.reconciliationDate ? new Date(updateDto.reconciliationDate) : recon.reconciliationDate
    });
    
    return this.bankReconciliationRepository.save(recon);
  }

  async remove(id: string): Promise<void> {
    const recon = await this.findOne(id);
    await this.bankTransactionRepository.update(
      { bankReconciliationId: id },
      { bankReconciliationId: null }
    );
    await this.bankReconciliationRepository.remove(recon);
  }

  async getPdf(id: string): Promise<Buffer> {
    const recon = await this.findOne(id);
    const bankAccount = await this.bankAccountRepository.findOne({ where: { id: recon.bankAccountId } });
    const transactions = await this.bankTransactionRepository.find({
      where: { bankReconciliationId: id },
      order: { date: 'ASC' },
    });

    const data = {
      reconciliationDate: recon.reconciliationDate,
      accountName: bankAccount ? bankAccount.bankName : 'N/A',
      description: recon.description,
      statementBalance: recon.statementBalance,
      accountingBalance: recon.accountingBalance,
      difference: recon.difference,
      status: recon.status,
      transactions: transactions,
    };

    return this.pdfGeneratorService.generateBankReconciliation(data);
  }
}
