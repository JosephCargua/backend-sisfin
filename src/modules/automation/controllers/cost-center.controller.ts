import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CostCenterService } from '../services/cost-center.service';
import { CreateCostCenterDto } from '../dto/create-cost-center.dto';

@ApiTags('Cost Centers')
@Controller('cost-centers')
export class CostCenterController {
  constructor(private readonly costCenterService: CostCenterService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new cost center' })
  create(@Body() createCostCenterDto: CreateCostCenterDto) {
    return this.costCenterService.create(createCostCenterDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all cost centers' })
  findAll() {
    return this.costCenterService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get cost center by ID' })
  findOne(@Param('id') id: string) {
    return this.costCenterService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update cost center' })
  update(@Param('id') id: string, @Body() updateDto: Partial<CreateCostCenterDto>) {
    return this.costCenterService.update(id, updateDto);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate cost center' })
  deactivate(@Param('id') id: string) {
    return this.costCenterService.deactivate(id);
  }
}

