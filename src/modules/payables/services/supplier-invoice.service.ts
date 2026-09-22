import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import Decimal from 'decimal.js';
import { SupplierInvoice } from '../entities/supplier-invoice.entity';
import { SupplierPayment } from '../entities/supplier-payment.entity';
import { Supplier } from '../entities/supplier.entity';
import { CreateSupplierInvoiceDto } from '../dto/create-supplier-invoice.dto';
import { CreateSupplierPaymentDto } from '../dto/create-supplier-payment.dto';
import { JournalEntry } from '../../accounting/entities/journal-entry.entity';
import { JournalEntryLine } from '../../accounting/entities/journal-entry-line.entity';
import { JournalEntryService } from '../../accounting/services/journal-entry.service';
import { ConfigService } from '../../config/config.service';

@Injectable()
export class SupplierInvoiceService {
  constructor(
    @InjectRepository(SupplierInvoice)
    private supplierInvoiceRepository: Repository<SupplierInvoice>,
    @InjectRepository(SupplierPayment)
    private supplierPaymentRepository: Repository<SupplierPayment>,
    @InjectRepository(Supplier)
    private supplierRepository: Repository<Supplier>,
    private journalEntryService: JournalEntryService,
    private configService: ConfigService,
    private dataSource: DataSource,
  ) {}

  async create(
    createInvoiceDto: CreateSupplierInvoiceDto,
  ): Promise<SupplierInvoice> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const supplier = await queryRunner.manager.findOne(Supplier, {
        where: { id: createInvoiceDto.supplierId },
      });

      if (!supplier) {
        throw new NotFoundException('Supplier not found');
      }

      let invoiceNumber = createInvoiceDto.invoiceNumber;

      if (!invoiceNumber) {
        invoiceNumber = await this.generateInvoiceNumber(
          createInvoiceDto.date,
          queryRunner,
        );
      } else {
        const existing = await queryRunner.manager.findOne(SupplierInvoice, {
          where: { invoiceNumber },
        });

        if (existing) {
          throw new BadRequestException('Invoice number already exists');
        }
      }

      const invoice = queryRunner.manager.create(SupplierInvoice, {
        ...createInvoiceDto,
        invoiceNumber,
        date: new Date(createInvoiceDto.date),
        dueDate: new Date(createInvoiceDto.dueDate),
        paidAmount: 0,
      });

      const saved = await queryRunner.manager.save(invoice);

      // Auto-Accounting
      const settings = await this.configService.getSettings();
      const accounts = settings.defaultAccounts || {};
      
      if (accounts.expenseAccountId && accounts.payableAccountId) {
        const entryNumber = await this.journalEntryService.generateEntryNumber(saved.date, queryRunner);
        const journalEntry = queryRunner.manager.create(JournalEntry, {
          entryNumber,
          date: saved.date,
          description: `Factura de Proveedor ${saved.invoiceNumber} - ${supplier.name}`,
        });
        const savedJournal = await queryRunner.manager.save(journalEntry);

        const line1 = queryRunner.manager.create(JournalEntryLine, {
          journalEntry: savedJournal,
          accountId: accounts.expenseAccountId,
          debit: saved.total,
          credit: 0,
          description: `Gasto Factura ${saved.invoiceNumber}`,
        });
        const line2 = queryRunner.manager.create(JournalEntryLine, {
          journalEntry: savedJournal,
          accountId: accounts.payableAccountId,
          debit: 0,
          credit: saved.total,
          description: `CxP Factura ${saved.invoiceNumber}`,
        });
        
        await queryRunner.manager.save([line1, line2]);
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

  async applyPayment(
    createPaymentDto: CreateSupplierPaymentDto,
  ): Promise<SupplierPayment> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const invoice = await queryRunner.manager.findOne(SupplierInvoice, {
        where: { id: createPaymentDto.supplierInvoiceId },
      });

      if (!invoice) {
        throw new NotFoundException('Supplier invoice not found');
      }

      const paymentAmount = new Decimal(createPaymentDto.amount);
      const currentPaid = new Decimal(invoice.paidAmount);
      const invoiceTotal = new Decimal(invoice.total);
      const newPaid = currentPaid.plus(paymentAmount);

      if (newPaid.greaterThan(invoiceTotal)) {
        throw new BadRequestException('Payment amount exceeds invoice total');
      }

      const payment = queryRunner.manager.create(SupplierPayment, {
        ...createPaymentDto,
        date: new Date(createPaymentDto.date),
      });

      const savedPayment = await queryRunner.manager.save(payment);

      // Auto-Accounting and Treasury
      if (createPaymentDto.bankAccountId) {
        const settings = await this.configService.getSettings();
        const accounts = settings.defaultAccounts || {};
        
        if (accounts.payableAccountId) {
          // Obtener datos auxiliares
          const supplier = await queryRunner.manager.findOne(Supplier, { where: { id: invoice.supplierId } });
          const bankAccount = await queryRunner.manager.findOne('BankAccount', { where: { id: createPaymentDto.bankAccountId } });
          
          if (supplier && bankAccount) {
            // Crear JournalEntry
            const entryNumber = await this.journalEntryService.generateEntryNumber(savedPayment.date, queryRunner);
            const journalEntry = queryRunner.manager.create(JournalEntry, {
              entryNumber,
              date: savedPayment.date,
              description: `Pago a Proveedor ${supplier.name} s/Factura ${invoice.invoiceNumber}`,
            });
            const savedJournal = await queryRunner.manager.save(journalEntry);

            const line1 = queryRunner.manager.create(JournalEntryLine, {
              journalEntry: savedJournal,
              accountId: accounts.payableAccountId,
              debit: savedPayment.amount,
              credit: 0,
              description: `CxP Pago Factura ${invoice.invoiceNumber}`,
            });
            const line2 = queryRunner.manager.create(JournalEntryLine, {
              journalEntry: savedJournal,
              accountId: (bankAccount as any).accountId, // bankAccount.accountId es la cuenta contable
              debit: 0,
              credit: savedPayment.amount,
              description: `Salida Bancos Pago a ${supplier.name}`,
            });
            await queryRunner.manager.save([line1, line2]);

            // Crear BankTransaction amarrada al JournalEntry
            const bankTx = queryRunner.manager.create('BankTransaction', {
              bankAccountId: createPaymentDto.bankAccountId,
              date: savedPayment.date,
              description: `Pago Factura ${invoice.invoiceNumber}`,
              amount: savedPayment.amount,
              type: 'Egreso',
              transactionType: 'Pago Proveedor',
              paymentMethod: createPaymentDto.paymentMethod || 'Transferencia',
              isAnnulled: false,
              personaId: supplier.id,
              personName: supplier.name,
              checkNumber: createPaymentDto.reference,
              journalEntryId: savedJournal.id,
            });
            await queryRunner.manager.save(bankTx);
          }
        }
      }

      invoice.paidAmount = newPaid.toNumber();
      await queryRunner.manager.save(invoice);

      await queryRunner.commitTransaction();
      return payment;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(): Promise<SupplierInvoice[]> {
    return this.supplierInvoiceRepository.find({
      order: { date: 'DESC' },
    });
  }

  async findOne(id: string): Promise<SupplierInvoice> {
    const invoice = await this.supplierInvoiceRepository.findOne({
      where: { id },
    });

    if (!invoice) {
      throw new NotFoundException(`Supplier invoice with ID ${id} not found`);
    }

    return invoice;
  }

  async findBySupplier(supplierId: string): Promise<SupplierInvoice[]> {
    return this.supplierInvoiceRepository.find({
      where: { supplierId },
      order: { date: 'DESC' },
    });
  }

  async getOverdueInvoices(): Promise<SupplierInvoice[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.supplierInvoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.dueDate < :today', { today })
      .andWhere('invoice.paidAmount < invoice.total')
      .orderBy('invoice.dueDate', 'ASC')
      .getMany();
  }

  async getInvoicePayments(invoiceId: string): Promise<SupplierPayment[]> {
    return this.supplierPaymentRepository.find({
      where: { supplierInvoiceId: invoiceId },
      order: { date: 'ASC' },
    });
  }

  private async generateInvoiceNumber(
    date: string,
    queryRunner: any,
  ): Promise<string> {
    const dateObj = new Date(date);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');

    const lastInvoice = await queryRunner.manager
      .createQueryBuilder(SupplierInvoice, 'invoice')
      .where('invoice.invoiceNumber LIKE :pattern', {
        pattern: `SUP-${year}${month}-%`,
      })
      .orderBy('invoice.invoiceNumber', 'DESC')
      .getOne();

    let sequence = 1;

    if (lastInvoice) {
      const parts = lastInvoice.invoiceNumber.split('-');
      const lastSequence = parseInt(parts[parts.length - 1], 10);
      sequence = lastSequence + 1;
    }

    return `SUP-${year}${month}-${String(sequence).padStart(6, '0')}`;
  }
}

