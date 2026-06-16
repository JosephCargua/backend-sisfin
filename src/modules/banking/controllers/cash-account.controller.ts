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
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CashAccountService } from '../services/cash-account.service';
import { CreateCashAccountDto } from '../dto/create-cash-account.dto';

@ApiTags('Cash Accounts')
@Controller('cash-accounts')
export class CashAccountController {
  constructor(private readonly cashAccountService: CashAccountService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new cash account' })
  create(@Body() createCashAccountDto: CreateCashAccountDto) {
    return this.cashAccountService.create(createCashAccountDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all cash accounts' })
  findAll() {
    return this.cashAccountService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get cash account by ID' })
  findOne(@Param('id') id: string) {
    return this.cashAccountService.findOne(id);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate cash account' })
  deactivate(@Param('id') id: string) {
    return this.cashAccountService.deactivate(id);
  }
}

