import {
  Controller,
  Get,
  Query,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportService } from '../services/report.service';
import { BalanceSheetQueryDto } from '../dto/balance-sheet-query.dto';
import { IncomeStatementQueryDto } from '../dto/income-statement-query.dto';
import { TrialBalanceQueryDto } from '../dto/trial-balance-query.dto';

@ApiTags('Reportes')
@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('trial-balance')
  @ApiOperation({ summary: 'Generar Balance de Comprobación' })
  async getTrialBalance(@Query() query: TrialBalanceQueryDto) {
    return this.reportService.generateTrialBalance(
      query.startDate,
      query.endDate,
      query.accountId,
    );
  }

  @Get('balance-sheet')
  @ApiOperation({ summary: 'Generar Balance General' })
  async getBalanceSheet(@Query() query: BalanceSheetQueryDto) {
    return this.reportService.generateBalanceSheet(
      query.date,
      query.costCenterId,
    );
  }

  @Get('balance-sheet/pdf')
  @ApiOperation({ summary: 'Exportar Balance General en PDF' })
  async getBalanceSheetPDF(
    @Query() query: BalanceSheetQueryDto,
    @Res() res: Response,
  ) {
    const pdf = await this.reportService.generateBalanceSheetPDF(
      query.date,
      query.costCenterId,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=balance-general-${query.date}.pdf`,
    );
    res.send(pdf);
  }

  @Get('balance-sheet/excel')
  @ApiOperation({ summary: 'Exportar Balance General en Excel' })
  async getBalanceSheetExcel(
    @Query() query: BalanceSheetQueryDto,
    @Res() res: Response,
  ) {
    const excel = await this.reportService.generateBalanceSheetExcel(
      query.date,
      query.costCenterId,
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=balance-general-${query.date}.xlsx`,
    );
    res.send(excel);
  }

  @Get('income-statement')
  @ApiOperation({ summary: 'Generar Estado de Resultados' })
  async getIncomeStatement(@Query() query: IncomeStatementQueryDto) {
    return this.reportService.generateIncomeStatement(
      query.startDate,
      query.endDate,
      query.costCenterId,
    );
  }

  @Get('income-statement/pdf')
  @ApiOperation({ summary: 'Exportar Estado de Resultados en PDF' })
  async getIncomeStatementPDF(
    @Query() query: IncomeStatementQueryDto,
    @Res() res: Response,
  ) {
    let signatures: any = null;
    if (query.signatures) {
      try {
        signatures = JSON.parse(query.signatures);
      } catch (error) {
        console.warn('Error parsing signatures, using defaults:', error);
      }
    }
    
    const pdf = await this.reportService.generateIncomeStatementPDF(
      query.startDate,
      query.endDate,
      query.costCenterId,
      signatures,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=estado-resultados-${query.startDate}-${query.endDate}.pdf`,
    );
    res.send(pdf);
  }

  @Get('income-statement/excel')
  @ApiOperation({ summary: 'Exportar Estado de Resultados en Excel' })
  async getIncomeStatementExcel(
    @Query() query: IncomeStatementQueryDto,
    @Res() res: Response,
  ) {
    const excel = await this.reportService.generateIncomeStatementExcel(
      query.startDate,
      query.endDate,
      query.costCenterId,
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=estado-resultados-${query.startDate}-${query.endDate}.xlsx`,
    );
    res.send(excel);
  }

  @Get('general-ledger/pdf')
  @ApiOperation({ summary: 'Exportar Libro Mayor en PDF' })
  @ApiQuery({ name: 'accountId', required: true })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiQuery({ name: 'costCenterId', required: false })
  async getGeneralLedgerPDF(
    @Query('accountId') accountId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('costCenterId') costCenterId: string | undefined,
    @Res() res: Response,
  ) {
    const pdf = await this.reportService.generateGeneralLedgerPDF(
      accountId,
      startDate,
      endDate,
      costCenterId,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=libro-mayor-${accountId}-${startDate}-${endDate}.pdf`,
    );
    res.send(pdf);
  }

  @Get('general-ledger/excel')
  @ApiOperation({ summary: 'Exportar Libro Mayor en Excel' })
  @ApiQuery({ name: 'accountId', required: true })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiQuery({ name: 'costCenterId', required: false })
  async getGeneralLedgerExcel(
    @Query('accountId') accountId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('costCenterId') costCenterId: string | undefined,
    @Res() res: Response,
  ) {
    const excel = await this.reportService.generateGeneralLedgerExcel(
      accountId,
      startDate,
      endDate,
      costCenterId,
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=libro-mayor-${accountId}-${startDate}-${endDate}.xlsx`,
    );
    res.send(excel);
  }
}

