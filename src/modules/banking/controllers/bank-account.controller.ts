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
import { BankAccountService } from '../services/bank-account.service';
import { CreateBankAccountDto } from '../dto/create-bank-account.dto';

@ApiTags('Bank Accounts')
@Controller('bank-accounts')
export class BankAccountController {
  constructor(private readonly bankAccountService: BankAccountService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new bank account' })
  create(@Body() createBankAccountDto: CreateBankAccountDto) {
    return this.bankAccountService.create(createBankAccountDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all bank accounts' })
  findAll() {
    return this.bankAccountService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get bank account by ID' })
  findOne(@Param('id') id: string) {
    return this.bankAccountService.findOne(id);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate bank account' })
  deactivate(@Param('id') id: string) {
    return this.bankAccountService.deactivate(id);
  }
}

