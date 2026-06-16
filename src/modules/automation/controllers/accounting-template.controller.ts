import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AccountingTemplateService } from '../services/accounting-template.service';
import { CreateAccountingTemplateDto } from '../dto/create-accounting-template.dto';

@ApiTags('Accounting Templates')
@Controller('accounting-templates')
export class AccountingTemplateController {
  constructor(
    private readonly templateService: AccountingTemplateService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new accounting template' })
  create(@Body() createTemplateDto: CreateAccountingTemplateDto) {
    return this.templateService.create(createTemplateDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all accounting templates' })
  findAll() {
    return this.templateService.findAll();
  }

  @Get('transaction-type/:type')
  @ApiOperation({ summary: 'Get templates by transaction type' })
  findByTransactionType(@Param('type') type: string) {
    return this.templateService.findByTransactionType(type);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get template by ID' })
  findOne(@Param('id') id: string) {
    return this.templateService.findOne(id);
  }

  @Post(':id/apply')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Apply template to create journal entry' })
  applyTemplate(
    @Param('id') id: string,
    @Body() data: { data: Record<string, any>; date: string; userId?: string },
  ) {
    return this.templateService.applyTemplate(
      id,
      data.data,
      data.date,
      data.userId,
    );
  }
}

