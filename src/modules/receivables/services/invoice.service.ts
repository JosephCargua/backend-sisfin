import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import Decimal from 'decimal.js';
import { Invoice } from '../entities/invoice.entity';
import { Payment } from '../entities/payment.entity';
import { Customer } from '../entities/customer.entity';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { CreatePaymentDto } from '../dto/create-payment.dto';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    private dataSource: DataSource,
  ) {}

  async create(createInvoiceDto: CreateInvoiceDto): Promise<Invoice> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const customer = await queryRunner.manager.findOne(Customer, {
        where: { id: createInvoiceDto.customerId },
      });

      if (!customer) {
        throw new NotFoundException('Customer not found');
      }

      let invoiceNumber = createInvoiceDto.invoiceNumber;

      if (!invoiceNumber) {
        invoiceNumber = await this.generateInvoiceNumber(
          createInvoiceDto.date,
          queryRunner,
        );
      } else {
        const existing = await queryRunner.manager.findOne(Invoice, {
          where: { invoiceNumber },
        });

        if (existing) {
          throw new BadRequestException('Invoice number already exists');
        }
      }

      const invoice = queryRunner.manager.create(Invoice, {
        ...createInvoiceDto,
        invoiceNumber,
        date: new Date(createInvoiceDto.date),
        paidAmount: 0,
      });

      const saved = await queryRunner.manager.save(invoice);
      await queryRunner.commitTransaction();
      return saved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async applyPayment(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const invoice = await queryRunner.manager.findOne(Invoice, {
        where: { id: createPaymentDto.invoiceId },
      });

      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }

      const paymentAmount = new Decimal(createPaymentDto.amount);
      const currentPaid = new Decimal(invoice.paidAmount);
      const invoiceTotal = new Decimal(invoice.total);
      const newPaid = currentPaid.plus(paymentAmount);

      if (newPaid.greaterThan(invoiceTotal)) {
        throw new BadRequestException('Payment amount exceeds invoice total');
      }

      const payment = queryRunner.manager.create(Payment, {
        ...createPaymentDto,
        date: new Date(createPaymentDto.date),
      });

      await queryRunner.manager.save(payment);

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

  async findAll(): Promise<Invoice[]> {
    return this.invoiceRepository.find({
      relations: ['customerId'],
      order: { date: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    return invoice;
  }

  async findByCustomer(customerId: string): Promise<Invoice[]> {
    return this.invoiceRepository.find({
      where: { customerId },
      order: { date: 'DESC' },
    });
  }

  async getInvoicePayments(invoiceId: string): Promise<Payment[]> {
    return this.paymentRepository.find({
      where: { invoiceId },
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
      .createQueryBuilder(Invoice, 'invoice')
      .where('invoice.invoiceNumber LIKE :pattern', {
        pattern: `INV-${year}${month}-%`,
      })
      .orderBy('invoice.invoiceNumber', 'DESC')
      .getOne();

    let sequence = 1;

    if (lastInvoice) {
      const parts = lastInvoice.invoiceNumber.split('-');
      const lastSequence = parseInt(parts[parts.length - 1], 10);
      sequence = lastSequence + 1;
    }

    return `INV-${year}${month}-${String(sequence).padStart(6, '0')}`;
  }
}

