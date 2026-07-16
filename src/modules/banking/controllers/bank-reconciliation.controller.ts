import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { BankReconciliationService } from '../services/bank-reconciliation.service';
import { CreateBankReconciliationDto } from '../dto/create-bank-reconciliation.dto';

@Controller('bank-reconciliations')
export class BankReconciliationController {
  constructor(private readonly bankReconciliationService: BankReconciliationService) {}

  @Post()
  create(@Body() createDto: CreateBankReconciliationDto) {
    return this.bankReconciliationService.create(createDto);
  }

  @Get()
  findAll() {
    return this.bankReconciliationService.findAll();
  }

  @Get(':id/pdf')
  async getPdf(@Param('id') id: string, @Res() res: Response) {
    const pdf = await this.bankReconciliationService.getPdf(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=conciliacion-${id}.pdf`,
    );
    res.send(pdf);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bankReconciliationService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: any,
  ) {
    return this.bankReconciliationService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bankReconciliationService.remove(id);
  }
}
