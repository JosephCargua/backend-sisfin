import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { InventoryMovement } from './entities/inventory-movement.entity';
import { ProductController } from './controllers/product.controller';
import { InventoryMovementController } from './controllers/inventory-movement.controller';
import { ProductService } from './services/product.service';
import { InventoryMovementService } from './services/inventory-movement.service';

@Module({
  imports: [TypeOrmModule.forFeature([Product, InventoryMovement])],
  controllers: [ProductController, InventoryMovementController],
  providers: [ProductService, InventoryMovementService],
  exports: [ProductService, InventoryMovementService],
})
export class InventoryModule {}

