import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import Decimal from 'decimal.js';
import { Retention } from '../entities/retention.entity';
import { CreateRetentionDto } from '../dto/create-retention.dto';
import { XmlGeneratorService } from './xml-generator.service';
import { AccessKeyGeneratorService } from './access-key-generator.service';

@Injectable()
export class RetentionService {
  constructor(
    @InjectRepository(Retention)
    private retentionRepository: Repository<Retention>,
    private xmlGeneratorService: XmlGeneratorService,
    private accessKeyGeneratorService: AccessKeyGeneratorService,
    private dataSource: DataSource,
  ) {}

  async create(createRetentionDto: CreateRetentionDto): Promise<Retention> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const retentionAmount = new Decimal(createRetentionDto.baseAmount)
        .times(createRetentionDto.retentionRate)
        .dividedBy(100)
        .toNumber();

      let documentNumber = createRetentionDto.documentNumber;
      if (!documentNumber) {
        documentNumber = await this.generateDocumentNumber(
          createRetentionDto.issueDate,
          queryRunner,
        );
      }

      const accessKey = this.accessKeyGeneratorService.generateAccessKey(
        new Date(createRetentionDto.issueDate),
        '07',
        '001',
        '001',
        documentNumber.split('-')[2] || '000000001',
        createRetentionDto.environment || '2',
      );

      const retention = queryRunner.manager.create(Retention, {
        accessKey,
        documentNumber,
        issueDate: new Date(createRetentionDto.issueDate),
        supplierIdentification: createRetentionDto.supplierIdentification,
        supplierName: createRetentionDto.supplierName,
        type: createRetentionDto.type,
        retentionCode: createRetentionDto.retentionCode,
        baseAmount: createRetentionDto.baseAmount,
        retentionRate: createRetentionDto.retentionRate,
        retentionAmount: retentionAmount,
        environment: createRetentionDto.environment || '2',
      });

      const xmlContent = this.xmlGeneratorService.generateRetentionXML(retention);
      retention.xmlContent = xmlContent;

      const saved = await queryRunner.manager.save(retention);
      await queryRunner.commitTransaction();
      return saved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async signRetention(id: string): Promise<Retention> {
    const retention = await this.findOne(id);

    const signedXml = await this.signXML(retention.xmlContent || '');

    retention.signedXml = signedXml;

    return this.retentionRepository.save(retention);
  }

  async authorizeRetention(
    id: string,
    authorizationNumber: string,
  ): Promise<Retention> {
    const retention = await this.findOne(id);

    retention.authorizationNumber = authorizationNumber;
    retention.authorizationDate = new Date();

    return this.retentionRepository.save(retention);
  }

  async findAll(): Promise<Retention[]> {
    return this.retentionRepository.find({
      order: { issueDate: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Retention> {
    const retention = await this.retentionRepository.findOne({
      where: { id },
    });

    if (!retention) {
      throw new NotFoundException(`Retención con ID ${id} no encontrada`);
    }

    return retention;
  }

  private async generateDocumentNumber(
    date: string,
    queryRunner: any,
  ): Promise<string> {
    const dateObj = new Date(date);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');

    const lastRetention = await queryRunner.manager
      .createQueryBuilder(Retention, 'retention')
      .where('retention.documentNumber LIKE :pattern', {
        pattern: `001-001-${year}${month}%`,
      })
      .orderBy('retention.documentNumber', 'DESC')
      .getOne();

    let sequence = 1;

    if (lastRetention) {
      const parts = lastRetention.documentNumber.split('-');
      const lastSequence = parseInt(parts[parts.length - 1], 10);
      sequence = lastSequence + 1;
    }

    return `001-001-${String(sequence).padStart(9, '0')}`;
  }

  private async signXML(xmlContent: string): Promise<string> {
    return `<?xml version="1.0" encoding="UTF-8"?>
<signedDocument>
  <signature>
    <signedInfo>
      <canonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
      <signatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
    </signedInfo>
    <signatureValue>FIRMA_ELECTRONICA_SIMULADA</signatureValue>
  </signature>
  ${xmlContent}
</signedDocument>`;
  }
}

