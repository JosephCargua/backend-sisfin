import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BankTransaction } from '../entities/bank-transaction.entity';
import { BankTransactionDetail } from '../entities/bank-transaction-detail.entity';
import { BankAccount } from '../entities/bank-account.entity';
import { CreateBankTransactionDto } from '../dto/create-bank-transaction.dto';
import { JournalEntry } from '../../accounting/entities/journal-entry.entity';
import { JournalEntryLine } from '../../accounting/entities/journal-entry-line.entity';
import { JournalEntryStatus } from '../../accounting/enums/journal-entry-status.enum';
import { FinancialDocument } from '../../documents/entities/financial-document.entity';
import { ElectronicDocumentRegistration } from '../../tax/entities/electronic-document-registration.entity';
import { DocumentPayment, DocumentPaymentType, PaymentTransactionType } from '../../documents/entities/document-payment.entity';
import { BadRequestException } from '@nestjs/common';
import { JournalEntryService } from '../../accounting/services/journal-entry.service';

@Injectable()
export class BankTransactionService {
  constructor(
    @InjectRepository(BankTransaction)
    private bankTransactionRepository: Repository<BankTransaction>,
    @InjectRepository(BankAccount)
    private bankAccountRepository: Repository<BankAccount>,
    @InjectRepository(JournalEntryLine)
    private journalEntryLineRepository: Repository<JournalEntryLine>,
    private journalEntryService: JournalEntryService,
    private dataSource: DataSource,
  ) {}

  async create(
    createTransactionDto: CreateBankTransactionDto,
  ): Promise<BankTransaction> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let bankAccount = null;
      if (createTransactionDto.bankAccountId) {
        bankAccount = await queryRunner.manager.findOne(BankAccount, {
          where: { id: createTransactionDto.bankAccountId },
        });
        if (!bankAccount) {
          throw new NotFoundException('Bank account not found');
        }
      }

      const transaction = queryRunner.manager.create(BankTransaction, {
        ...(createTransactionDto as any),
        date: createTransactionDto.date,
        checkDate: createTransactionDto.checkDate || undefined,
      });

      // Si hay detalles, mapéalos
      if (createTransactionDto.details && createTransactionDto.details.length > 0) {
        transaction.details = createTransactionDto.details.map(detailDto => {
          return queryRunner.manager.create(BankTransactionDetail, detailDto);
        });
      }

      const saved = await queryRunner.manager.save(transaction);

      // Actualizar amountPaid de los documentos y crear DocumentPayment
      if (saved.details && saved.details.length > 0) {
        for (const detail of saved.details) {
          if (detail.sourceType === 'DOCUMENT' && detail.documentNumber) {
            let docId = null;
            let docType = null;
            
            // Buscar en FinancialDocument
            const document = await queryRunner.manager.createQueryBuilder(FinancialDocument, 'fd')
              .where('fd.documentNumber = :docNum', { docNum: detail.documentNumber })
              .getOne();
            if (document) {
              const newAmountPaid = Number(document.amountPaid) + Number(detail.amount);
              if (newAmountPaid > Number(document.total)) {
                throw new BadRequestException(`El monto a pagar ($${detail.amount}) excede el saldo pendiente del documento ${document.documentNumber}`);
              }
              document.amountPaid = newAmountPaid;
              await queryRunner.manager.save(document);
              docId = document.id;
              docType = DocumentPaymentType.FINANCIAL;
            }
            
            // Buscar en ElectronicDocumentRegistration
            const electronicDoc = await queryRunner.manager.createQueryBuilder(ElectronicDocumentRegistration, 'edr')
              .where('edr.documentNumber = :docNum', { docNum: detail.documentNumber })
              .orWhere('edr.documentLabel = :docNum', { docNum: detail.documentNumber })
              .getOne();
            if (electronicDoc) {
              const newAmountPaid = Number(electronicDoc.amountPaid) + Number(detail.amount);
              if (newAmountPaid > Number(electronicDoc.total)) {
                throw new BadRequestException(`El monto a pagar ($${detail.amount}) excede el saldo pendiente del documento ${electronicDoc.documentNumber}`);
              }
              electronicDoc.amountPaid = newAmountPaid;
              await queryRunner.manager.save(electronicDoc);
              docId = electronicDoc.id;
              docType = DocumentPaymentType.ELECTRONIC;
            }

            // Crear el registro en DocumentPayment
            if (docId && docType) {
              const paymentRecord = queryRunner.manager.create(DocumentPayment, {
                documentId: docId,
                documentType: docType,
                amount: Number(detail.amount),
                transactionType: PaymentTransactionType.BANK,
                transactionId: saved.id
              });
              await queryRunner.manager.save(paymentRecord);
            }
          }
        }
      }

      // GENERAR ASIENTO CONTABLE SI APLICA
      try {
        const jeLines = [];
        let bankAccountIdForJe = null;
        
        if (bankAccount && bankAccount.accountId) {
           bankAccountIdForJe = bankAccount.accountId;
        } else {
           // Fallback a cuenta de caja principal
           const res = await queryRunner.manager.query(`SELECT "accountId" FROM cash_accounts LIMIT 1`);
           if (res && res.length > 0) bankAccountIdForJe = res[0].accountId;
        }

        if (bankAccountIdForJe && saved.details && saved.details.length > 0) {
           let totalMonto = Number(saved.amount);
           let offsetAccountId = null;
           
           if (saved.type === 'Ingreso' || saved.type === 'Cobro') {
              const res = await queryRunner.manager.query(`SELECT id FROM accounts WHERE name ILIKE '%CUENTAS POR COBRAR%' OR name ILIKE '%CLIENTES%' LIMIT 1`);
              if (res && res.length > 0) offsetAccountId = res[0].id;
              
              if (offsetAccountId) {
                jeLines.push({ accountId: bankAccountIdForJe, debit: totalMonto, credit: 0, description: saved.description || 'Cobro' });
                jeLines.push({ accountId: offsetAccountId, debit: 0, credit: totalMonto, description: saved.description || 'Cobro' });
              }
           } else {
              const res = await queryRunner.manager.query(`SELECT id FROM accounts WHERE name ILIKE '%CUENTAS POR PAGAR%' OR name ILIKE '%PROVEEDOR%' LIMIT 1`);
              if (res && res.length > 0) offsetAccountId = res[0].id;
              
              if (offsetAccountId) {
                jeLines.push({ accountId: offsetAccountId, debit: totalMonto, credit: 0, description: saved.description || 'Pago' });
                jeLines.push({ accountId: bankAccountIdForJe, debit: 0, credit: totalMonto, description: saved.description || 'Pago' });
              }
           }

           if (jeLines.length === 2) {
             const entryNumber = await this.journalEntryService.generateEntryNumber(saved.date, queryRunner);
             
             const journalEntry = queryRunner.manager.create(JournalEntry, {
               entryNumber,
               date: saved.date,
               description: saved.description || `Transacción Bancaria ${saved.type}`,
               status: JournalEntryStatus.POSTED,
               totalDebit: totalMonto,
               totalCredit: totalMonto,
               reference: saved.checkNumber || saved.paymentMethod || null,
             });
             const savedJe = await queryRunner.manager.save(journalEntry);
             
             for (const line of jeLines) {
               const jeLine = queryRunner.manager.create(JournalEntryLine, {
                 ...line,
                 journalEntryId: savedJe.id
               });
               await queryRunner.manager.save(jeLine);
             }
             
             saved.journalEntryId = savedJe.id;
             await queryRunner.manager.save(saved);
           }
        }
      } catch(err) {
         console.error('Failed to create journal entry for bank transaction:', err);
      }

      await queryRunner.commitTransaction();
      return saved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findByBankAccount(bankAccountId: string): Promise<any[]> {
    const bankAccount = await this.bankAccountRepository.findOne({ where: { id: bankAccountId } });
    if (!bankAccount) {
      throw new NotFoundException('Bank account not found');
    }

    const transactions = await this.bankTransactionRepository.find({
      where: { bankAccountId, isAnnulled: false },
      order: { date: 'DESC', createdAt: 'DESC' },
    });

    const journalLines = await this.journalEntryLineRepository.find({
      where: { accountId: bankAccount.accountId },
      relations: ['journalEntry'],
    });

    const filteredJournalLines = journalLines.filter(line => line.journalEntry.status !== JournalEntryStatus.CANCELLED);

    const mappedJournalLines = filteredJournalLines.map(line => ({
      id: line.id,
      bankAccountId: line.accountId,
      date: line.journalEntry.date,
      description: line.description || line.journalEntry.description || 'Asiento Contable',
      amount: line.debit > 0 ? line.debit : line.credit,
      type: line.debit > 0 ? 'Ingreso' : 'Egreso',
      transactionType: 'Asiento Contable',
      paymentMethod: 'Caja/Banco',
      isAnnulled: false,
      personName: null,
      payToOrderOf: null,
      checkDate: null,
      bankReconciliationId: line.bankReconciliationId,
      createdAt: line.journalEntry.createdAt,
      sourceJournalEntryId: line.journalEntry.id,
    }));

    const combined = [...transactions, ...mappedJournalLines];
    combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Extract all journalEntryIds from transactions
    const linkedJournalIds = new Set(
      transactions.map(tx => tx.journalEntryId).filter(id => id)
    );

    const uniqueCombined = [];
    for (const item of combined) {
      if ((item as any).sourceJournalEntryId && linkedJournalIds.has((item as any).sourceJournalEntryId)) {
        // Drop the JournalEntryLine because we already have the BankTransaction covering it
        continue;
      }
      uniqueCombined.push(item);
    }
    
    return uniqueCombined;
  }

  async getAccountStatement(
    bankAccountId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<any> {
    const bankAccount = await this.bankAccountRepository.findOne({ where: { id: bankAccountId } });
    if (!bankAccount) {
      throw new NotFoundException('Bank account not found');
    }
    
    // Calcular Saldo Inicial (sumatoria histórica antes del startDate)
    let initialBalance = 0;
    if (startDate) {
      const prevTransactions = await this.bankTransactionRepository
        .createQueryBuilder('tx')
        .where('tx.bankAccountId = :bankAccountId', { bankAccountId })
        .andWhere('tx.date < :startDate', { startDate: new Date(startDate) })
        .getMany();
        
      initialBalance = prevTransactions.reduce((acc, tx) => {
        const amount = Number(tx.amount) || 0;
        if (tx.transactionType === 'Egreso' || tx.type === 'Egreso') {
          return acc - amount;
        } else {
          return acc + amount;
        }
      }, 0);

      const prevJournalLines = await this.journalEntryLineRepository
        .createQueryBuilder('line')
        .leftJoinAndSelect('line.journalEntry', 'je')
        .where('line.accountId = :accountId', { accountId: bankAccount.accountId })
        .andWhere('je.date < :startDate', { startDate: new Date(startDate) })
        .getMany();

      const journalBalance = prevJournalLines.reduce((acc, line) => {
        // Debit = Ingreso (increase balance), Credit = Egreso (decrease balance)
        const debit = Number(line.debit) || 0;
        const credit = Number(line.credit) || 0;
        return acc + debit - credit;
      }, 0);

      initialBalance += journalBalance;
    }

    const queryBuilder = this.bankTransactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.bankAccountId = :bankAccountId', { bankAccountId })
      .andWhere('transaction.isAnnulled = :isAnnulled', { isAnnulled: false });

    if (startDate) {
      queryBuilder.andWhere('transaction.date >= :startDate', {
        startDate: new Date(startDate),
      });
    }

    if (endDate) {
      queryBuilder.andWhere('transaction.date <= :endDate', {
        endDate: new Date(endDate),
      });
    }

    const transactions = await queryBuilder
      .orderBy('transaction.date', 'ASC')
      .addOrderBy('transaction.createdAt', 'ASC')
      .getMany();

    const journalQueryBuilder = this.journalEntryLineRepository
      .createQueryBuilder('line')
      .leftJoinAndSelect('line.journalEntry', 'je')
      .where('line.accountId = :accountId', { accountId: bankAccount.accountId })
      .andWhere('je.status != :status', { status: JournalEntryStatus.CANCELLED });

    if (startDate) {
      journalQueryBuilder.andWhere('je.date >= :startDate', {
        startDate: new Date(startDate),
      });
    }

    if (endDate) {
      journalQueryBuilder.andWhere('je.date <= :endDate', {
        endDate: new Date(endDate),
      });
    }

    const journalLines = await journalQueryBuilder.getMany();

    const mappedJournalLines = journalLines.map(line => ({
      id: line.id,
      bankAccountId: line.accountId,
      date: line.journalEntry.date,
      description: line.description || line.journalEntry.description || 'Asiento Contable',
      amount: line.debit > 0 ? line.debit : line.credit,
      type: line.debit > 0 ? 'Ingreso' : 'Egreso',
      transactionType: 'Asiento Contable',
      paymentMethod: 'Caja/Banco',
      isAnnulled: line.journalEntry.status === JournalEntryStatus.CANCELLED,
      personName: null,
      payToOrderOf: null,
      checkNumber: line.reference || line.journalEntry.reference,
      checkDate: null,
      bankReconciliationId: line.bankReconciliationId,
      createdAt: line.journalEntry.createdAt,
      sourceJournalEntryId: line.journalEntry.id,
    }));

    const combined = [...transactions, ...mappedJournalLines];
    combined.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Extract all journalEntryIds from transactions
    const linkedJournalIds = new Set(
      transactions.map(tx => tx.journalEntryId).filter(id => id)
    );

    const uniqueCombined = [];
    for (const item of combined) {
      if ((item as any).sourceJournalEntryId && linkedJournalIds.has((item as any).sourceJournalEntryId)) {
        // Drop the JournalEntryLine because we already have the BankTransaction covering it
        continue;
      }
      uniqueCombined.push(item);
    }

    return {
      bankAccountId,
      startDate,
      endDate,
      initialBalance,
      transactions: uniqueCombined,
      count: uniqueCombined.length,
    };
  }

  async findAll(): Promise<BankTransaction[]> {
    return this.bankTransactionRepository.find({
      relations: ['details'],
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<BankTransaction> {
    const transaction = await this.bankTransactionRepository.findOne({
      where: { id },
      relations: ['details'],
    });
    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }
    return transaction;
  }

  async update(id: string, updateDto: CreateBankTransactionDto): Promise<BankTransaction> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existing = await queryRunner.manager.findOne(BankTransaction, {
        where: { id },
        relations: ['details'],
      });

      if (!existing) {
        throw new NotFoundException(`Transaction with ID ${id} not found`);
      }

      // Update basic fields
      queryRunner.manager.merge(BankTransaction, existing, {
        ...(updateDto as any),
        date: new Date(updateDto.date),
        checkDate: updateDto.checkDate ? new Date(updateDto.checkDate) : undefined,
      });

      // Handle details
      if (updateDto.details) {
        // Remove existing details
        if (existing.details && existing.details.length > 0) {
          await queryRunner.manager.remove(existing.details);
        }
        
        // Add new details
        existing.details = updateDto.details.map(detailDto => {
          return queryRunner.manager.create(BankTransactionDetail, detailDto);
        });
      }

      const saved = await queryRunner.manager.save(existing);
      await queryRunner.commitTransaction();
      return saved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async delete(id: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const transaction = await queryRunner.manager.findOne(BankTransaction, {
        where: { id }
      });

      if (!transaction) {
        throw new NotFoundException(`Transaction with ID ${id} not found`);
      }

      transaction.isAnnulled = true;
      await queryRunner.manager.save(transaction);

      if (transaction.journalEntryId) {
        await queryRunner.manager.query(
          `UPDATE journal_entries SET status = $1, "cancellationReason" = $2, "cancelledAt" = NOW() WHERE id = $3`,
          [JournalEntryStatus.CANCELLED, 'Transacción bancaria eliminada/anulada', transaction.journalEntryId]
        );
      }

      // Revertir pagos asociados
      const payments = await queryRunner.manager.query(
        `SELECT id, "documentId", "documentType", amount FROM document_payments WHERE "transactionId" = $1 AND "transactionType" = 'bank'`,
        [id]
      );

      for (const p of payments) {
        if (p.documentType === DocumentPaymentType.FINANCIAL) {
          const doc = await queryRunner.manager.findOne(FinancialDocument, { where: { id: p.documentId } });
          if (doc) {
            doc.amountPaid = Number(doc.amountPaid) - Number(p.amount);
            await queryRunner.manager.save(doc);
          }
        } else if (p.documentType === DocumentPaymentType.ELECTRONIC) {
          const doc = await queryRunner.manager.findOne(ElectronicDocumentRegistration, { where: { id: p.documentId } });
          if (doc) {
            doc.amountPaid = Number(doc.amountPaid) - Number(p.amount);
            await queryRunner.manager.save(doc);
          }
        }
        await queryRunner.manager.query(`DELETE FROM document_payments WHERE id = $1`, [p.id]);
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}

