import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ATS, ATSStatus } from '../entities/ats.entity';
import { ElectronicInvoice } from '../entities/electronic-invoice.entity';
import { Retention } from '../entities/retention.entity';
import { XmlGeneratorService } from './xml-generator.service';

@Injectable()
export class ATSService {
  constructor(
    @InjectRepository(ATS)
    private atsRepository: Repository<ATS>,
    @InjectRepository(ElectronicInvoice)
    private invoiceRepository: Repository<ElectronicInvoice>,
    @InjectRepository(Retention)
    private retentionRepository: Repository<Retention>,
    private xmlGeneratorService: XmlGeneratorService,
    private dataSource: DataSource,
  ) {}

  async generateATS(year: number, month: number): Promise<ATS> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existing = await queryRunner.manager.findOne(ATS, {
        where: { year, month },
      });

      if (existing) {
        throw new BadRequestException(
          `ATS para ${year}-${String(month).padStart(2, '0')} ya existe`,
        );
      }

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const invoices = await queryRunner.manager
        .createQueryBuilder(ElectronicInvoice, 'invoice')
        .where('invoice.issueDate >= :startDate', { startDate })
        .andWhere('invoice.issueDate <= :endDate', { endDate })
        .andWhere('invoice.status = :status', { status: 'AUTHORIZED' })
        .getMany();

      const retentions = await queryRunner.manager
        .createQueryBuilder(Retention, 'retention')
        .where('retention.issueDate >= :startDate', { startDate })
        .andWhere('retention.issueDate <= :endDate', { endDate })
        .getMany();

      const totalAmount = invoices.reduce((sum, inv) => sum + inv.total, 0);

      const ats = queryRunner.manager.create(ATS, {
        year,
        month,
        status: ATSStatus.DRAFT,
        totalInvoices: invoices.length,
        totalAmount,
      });

      const saved = await queryRunner.manager.save(ats);

      const xmlContent = this.xmlGeneratorService.generateATSXML(
        saved,
        invoices,
        retentions,
      );

      saved.xmlContent = xmlContent;
      saved.status = ATSStatus.GENERATED;

      const finalSaved = await queryRunner.manager.save(saved);
      await queryRunner.commitTransaction();
      return finalSaved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async submitATS(id: string): Promise<ATS> {
    const ats = await this.findOne(id);

    if (ats.status !== ATSStatus.GENERATED) {
      throw new BadRequestException('Solo se pueden enviar ATS generados');
    }

    ats.status = ATSStatus.SUBMITTED;
    ats.submittedAt = new Date();

    return this.atsRepository.save(ats);
  }

  async findAll(): Promise<ATS[]> {
    return this.atsRepository.find({
      order: { year: 'DESC', month: 'DESC' },
    });
  }

  async findOne(id: string): Promise<ATS> {
    const ats = await this.atsRepository.findOne({
      where: { id },
    });

    if (!ats) {
      throw new NotFoundException(`ATS con ID ${id} no encontrado`);
    }

    return ats;
  }

  async findByPeriod(year: number, month: number): Promise<ATS | null> {
    return this.atsRepository.findOne({
      where: { year, month },
    });
  }
}

