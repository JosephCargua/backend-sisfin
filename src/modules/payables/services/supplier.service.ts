import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Supplier } from '../entities/supplier.entity';
import { CreateSupplierDto } from '../dto/create-supplier.dto';

@Injectable()
export class SupplierService {
  constructor(
    @InjectRepository(Supplier)
    private supplierRepository: Repository<Supplier>,
    private dataSource: DataSource,
  ) {}

  async create(createSupplierDto: CreateSupplierDto): Promise<Supplier> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existing = await queryRunner.manager.findOne(Supplier, {
        where: { identification: createSupplierDto.identification },
      });

      if (existing) {
        throw new BadRequestException('Supplier identification already exists');
      }

      const supplier = queryRunner.manager.create(Supplier, createSupplierDto);
      const saved = await queryRunner.manager.save(supplier);
      await queryRunner.commitTransaction();
      return saved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(): Promise<Supplier[]> {
    return this.supplierRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Supplier> {
    const supplier = await this.supplierRepository.findOne({
      where: { id },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    return supplier;
  }

  async getSupplierBalance(supplierId: string): Promise<number> {
    await this.findOne(supplierId);

    const invoices = await this.supplierRepository.manager
      .createQueryBuilder()
      .select('SUM(invoice.total - invoice.paidAmount)', 'balance')
      .from('supplier_invoices', 'invoice')
      .where('invoice.supplierId = :supplierId', { supplierId })
      .getRawOne();

    return parseFloat(invoices?.balance || '0');
  }
}

