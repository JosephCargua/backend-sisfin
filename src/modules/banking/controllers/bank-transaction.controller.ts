import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BankTransactionService } from '../services/bank-transaction.service';
import { CreateBankTransactionDto } from '../dto/create-bank-transaction.dto';

@ApiTags('Bank Transactions')
@Controller('bank-transactions')
export class BankTransactionController {
  constructor(
    private readonly bankTransactionService: BankTransactionService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new bank transaction' })
  create(@Body() createTransactionDto: CreateBankTransactionDto) {
    return this.bankTransactionService.create(createTransactionDto);
  }

  @Get('bank-account/:bankAccountId')
  @ApiOperation({ summary: 'Get transactions by bank account' })
  findByBankAccount(@Param('bankAccountId') bankAccountId: string) {
    return this.bankTransactionService.findByBankAccount(bankAccountId);
  }

  @Get('bank-account/:bankAccountId/statement')
  @ApiOperation({ summary: 'Get bank account statement' })
  getStatement(
    @Param('bankAccountId') bankAccountId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.bankTransactionService.getAccountStatement(
      bankAccountId,
      startDate,
      endDate,
    );
  }
  @Get()
  @ApiOperation({ summary: 'Get all bank transactions' })
  findAll() {
    return this.bankTransactionService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single transaction by ID' })
  findOne(@Param('id') id: string) {
    return this.bankTransactionService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a bank transaction' })
  update(
    @Param('id') id: string,
    @Body() updateTransactionDto: CreateBankTransactionDto,
  ) {
    return this.bankTransactionService.update(id, updateTransactionDto);
  }
}

