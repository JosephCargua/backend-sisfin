import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JournalEntryService } from '../services/journal-entry.service';
import { CreateJournalEntryDto } from '../dto/create-journal-entry.dto';
import { GeneralLedgerQueryDto } from '../dto/general-ledger-query.dto';
import { JournalEntryStatus } from '../enums/journal-entry-status.enum';

@ApiTags('Journal Entries')
@Controller('journal-entries')
export class JournalEntryController {
  constructor(
    private readonly journalEntryService: JournalEntryService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new journal entry' })
  @ApiResponse({ status: 201, description: 'Journal entry created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Double entry validation failed' })
  create(@Body() createJournalEntryDto: CreateJournalEntryDto) {
    return this.journalEntryService.create(createJournalEntryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all journal entries' })
  @ApiResponse({ status: 200, description: 'List of journal entries' })
  findAll(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: JournalEntryStatus,
  ) {
    return this.journalEntryService.findAll(startDate, endDate, status);
  }

  @Get('general-ledger')
  @ApiOperation({ summary: 'Get general ledger for an account' })
  @ApiResponse({ status: 200, description: 'General ledger data' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  getGeneralLedger(@Query() query: GeneralLedgerQueryDto) {
    return this.journalEntryService.getGeneralLedger(
      query.accountId,
      query.startDate,
      query.endDate,
      query.costCenterId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get journal entry by ID' })
  @ApiResponse({ status: 200, description: 'Journal entry details' })
  @ApiResponse({ status: 404, description: 'Journal entry not found' })
  findOne(@Param('id') id: string) {
    return this.journalEntryService.findOne(id);
  }

  @Patch(':id/post')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Post a journal entry' })
  @ApiResponse({ status: 200, description: 'Journal entry posted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot post entry' })
  @ApiResponse({ status: 404, description: 'Journal entry not found' })
  post(@Param('id') id: string) {
    return this.journalEntryService.post(id);
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a journal entry' })
  @ApiResponse({ status: 200, description: 'Journal entry cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Cannot cancel entry' })
  @ApiResponse({ status: 404, description: 'Journal entry not found' })
  cancel(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.journalEntryService.cancel(id, reason);
  }
}

