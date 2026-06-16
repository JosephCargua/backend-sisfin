import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Customer } from '../entities/customer.entity';
import { CreateCustomerDto } from '../dto/create-customer.dto';

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    private dataSource: DataSource,
  ) {}

  async create(createCustomerDto: CreateCustomerDto): Promise<Customer> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existing = await queryRunner.manager.findOne(Customer, {
        where: { identification: createCustomerDto.identification },
      });

      if (existing) {
        throw new BadRequestException('Customer identification already exists');
      }

      const customer = queryRunner.manager.create(Customer, createCustomerDto);
      const saved = await queryRunner.manager.save(customer);
      await queryRunner.commitTransaction();
      return saved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(): Promise<Customer[]> {
    return this.customerRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Customer> {
    const customer = await this.customerRepository.findOne({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return customer;
  }

  async getCustomerBalance(customerId: string): Promise<number> {
    const customer = await this.findOne(customerId);

    const invoices = await this.customerRepository.manager
      .createQueryBuilder()
      .select('SUM(invoice.total - invoice.paidAmount)', 'balance')
      .from('invoices', 'invoice')
      .where('invoice.customerId = :customerId', { customerId })
      .getRawOne();

    return parseFloat(invoices?.balance || '0');
  }
}

