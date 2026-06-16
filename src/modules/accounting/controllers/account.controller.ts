import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AccountService } from '../services/account.service';
import { CreateAccountDto } from '../dto/create-account.dto';

@ApiTags('Accounts')
@Controller('accounts')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new account' })
  @ApiResponse({ status: 201, description: 'Account created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  create(@Body() createAccountDto: CreateAccountDto) {
    return this.accountService.create(createAccountDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all accounts' })
  @ApiResponse({ status: 200, description: 'List of accounts' })
  findAll() {
    return this.accountService.findAll();
  }

  @Get('hierarchy')
  @ApiOperation({ summary: 'Get accounts hierarchy' })
  @ApiResponse({ status: 200, description: 'Accounts hierarchy' })
  getHierarchy() {
    return this.accountService.getHierarchy();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get account by ID' })
  @ApiResponse({ status: 200, description: 'Account details' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  findOne(@Param('id') id: string) {
    return this.accountService.findOne(id);
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Get account by code' })
  @ApiResponse({ status: 200, description: 'Account details' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  findByCode(@Param('code') code: string) {
    return this.accountService.findByCode(code);
  }

  @Patch(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate an account' })
  @ApiResponse({ status: 200, description: 'Account deactivated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot deactivate account' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  deactivate(@Param('id') id: string) {
    return this.accountService.deactivate(id);
  }

  @Patch(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate an account' })
  @ApiResponse({ status: 200, description: 'Account activated successfully' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  activate(@Param('id') id: string) {
    return this.accountService.activate(id);
  }
}

