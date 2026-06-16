import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InventoryMovementService } from '../services/inventory-movement.service';
import { CreateInventoryMovementDto } from '../dto/create-inventory-movement.dto';

@ApiTags('Inventory Movements')
@Controller('inventory-movements')
export class InventoryMovementController {
  constructor(
    private readonly movementService: InventoryMovementService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create inventory movement' })
  create(@Body() createMovementDto: CreateInventoryMovementDto) {
    return this.movementService.create(createMovementDto);
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Get movements by product' })
  findByProduct(@Param('productId') productId: string) {
    return this.movementService.findByProduct(productId);
  }

  @Get('product/:productId/history')
  @ApiOperation({ summary: 'Get product inventory history' })
  getProductHistory(@Param('productId') productId: string) {
    return this.movementService.getProductHistory(productId);
  }
}

