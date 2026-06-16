import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import Decimal from 'decimal.js';
import { InventoryMovement } from '../entities/inventory-movement.entity';
import { Product } from '../entities/product.entity';
import { CreateInventoryMovementDto } from '../dto/create-inventory-movement.dto';

@Injectable()
export class InventoryMovementService {
  constructor(
    @InjectRepository(InventoryMovement)
    private movementRepository: Repository<InventoryMovement>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private dataSource: DataSource,
  ) {}

  async create(
    createMovementDto: CreateInventoryMovementDto,
  ): Promise<InventoryMovement> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const product = await queryRunner.manager.findOne(Product, {
        where: { id: createMovementDto.productId },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      let newStock = new Decimal(product.stock);
      let newCost = new Decimal(product.cost);

      if (createMovementDto.type === 'IN') {
        const incomingQty = new Decimal(createMovementDto.quantity);
        const incomingCost = new Decimal(createMovementDto.unitCost);

        const totalCurrent = newStock.times(product.cost);
        const totalIncoming = incomingQty.times(incomingCost);
        const totalNew = totalCurrent.plus(totalIncoming);
        const qtyNew = newStock.plus(incomingQty);

        newStock = qtyNew;
        newCost = qtyNew.greaterThan(0) ? totalNew.dividedBy(qtyNew) : newCost;
      } else if (createMovementDto.type === 'OUT') {
        const outgoingQty = new Decimal(createMovementDto.quantity);

        if (outgoingQty.greaterThan(newStock)) {
          throw new BadRequestException('Insufficient stock');
        }

        newStock = newStock.minus(outgoingQty);
      } else if (createMovementDto.type === 'ADJUSTMENT') {
        newStock = new Decimal(createMovementDto.quantity);
        newCost = new Decimal(createMovementDto.unitCost);
      } else {
        throw new BadRequestException('Invalid movement type');
      }

      const movement = queryRunner.manager.create(InventoryMovement, {
        ...createMovementDto,
        date: new Date(createMovementDto.date),
      });

      await queryRunner.manager.save(movement);

      product.stock = newStock.toNumber();
      product.cost = newCost.toNumber();

      await queryRunner.manager.save(product);

      await queryRunner.commitTransaction();
      return movement;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findByProduct(productId: string): Promise<InventoryMovement[]> {
    return this.movementRepository.find({
      where: { productId },
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  async getProductHistory(productId: string): Promise<any> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const movements = await this.findByProduct(productId);

    return {
      product,
      movements,
      currentStock: product.stock,
      currentCost: product.cost,
    };
  }
}

