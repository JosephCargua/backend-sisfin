import {
  Controller,
  Get,
  Post,
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
}

