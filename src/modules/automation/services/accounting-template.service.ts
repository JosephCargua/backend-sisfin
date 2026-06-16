import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AccountingTemplate } from '../entities/accounting-template.entity';
import { AccountingTemplateLine } from '../entities/accounting-template-line.entity';
import { CreateAccountingTemplateDto } from '../dto/create-accounting-template.dto';
import { JournalEntryService } from '../../accounting/services/journal-entry.service';
import { CreateJournalEntryDto } from '../../accounting/dto/create-journal-entry.dto';

@Injectable()
export class AccountingTemplateService {
  constructor(
    @InjectRepository(AccountingTemplate)
    private templateRepository: Repository<AccountingTemplate>,
    private journalEntryService: JournalEntryService,
    private dataSource: DataSource,
  ) {}

  async create(
    createTemplateDto: CreateAccountingTemplateDto,
  ): Promise<AccountingTemplate> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const template = queryRunner.manager.create(AccountingTemplate, {
        name: createTemplateDto.name,
        transactionType: createTemplateDto.transactionType,
        description: createTemplateDto.description,
      });

      const savedTemplate = await queryRunner.manager.save(template);

      const lines = createTemplateDto.lines.map((line, index) =>
        queryRunner.manager.create(AccountingTemplateLine, {
          ...line,
          templateId: savedTemplate.id,
          order: line.order || index + 1,
        }),
      );

      await queryRunner.manager.save(AccountingTemplateLine, lines);

      await queryRunner.commitTransaction();
      return this.findOne(savedTemplate.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(): Promise<AccountingTemplate[]> {
    return this.templateRepository.find({
      where: { isActive: true },
      relations: ['lines'],
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<AccountingTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id },
      relations: ['lines'],
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    return template;
  }

  async findByTransactionType(
    transactionType: string,
  ): Promise<AccountingTemplate[]> {
    return this.templateRepository.find({
      where: { transactionType, isActive: true },
      relations: ['lines'],
    });
  }

  async applyTemplate(
    templateId: string,
    data: Record<string, any>,
    date: string,
    userId?: string,
  ): Promise<any> {
    const template = await this.findOne(templateId);

    if (!template.isActive) {
      throw new BadRequestException('Template is not active');
    }

    const journalEntryLines = template.lines
      .sort((a, b) => a.order - b.order)
      .map((line) => {
        let amount = 0;

        if (line.formula) {
          amount = this.evaluateFormula(line.formula, data);
        } else if (data.amount) {
          amount = data.amount;
        }

        return {
          accountId: line.accountId,
          debit: line.side === 'DEBIT' ? amount : 0,
          credit: line.side === 'CREDIT' ? amount : 0,
          description: this.replacePlaceholders(line.formula || '', data),
        };
      });

    const createJournalEntryDto: CreateJournalEntryDto = {
      date,
      description: `Auto-generated from template: ${template.name}`,
      lines: journalEntryLines,
    };

    return this.journalEntryService.create(createJournalEntryDto, userId);
  }

  private evaluateFormula(formula: string, data: Record<string, any>): number {
    let result = formula;

    Object.keys(data).forEach((key) => {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      result = result.replace(regex, String(data[key]));
    });

    try {
      return eval(result) || 0;
    } catch {
      return 0;
    }
  }

  private replacePlaceholders(text: string, data: Record<string, any>): string {
    let result = text;

    Object.keys(data).forEach((key) => {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      result = result.replace(regex, String(data[key]));
    });

    return result;
  }
}

