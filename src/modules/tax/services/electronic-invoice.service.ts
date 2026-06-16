import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ElectronicInvoice, InvoiceStatus } from '../entities/electronic-invoice.entity';
import { CreateElectronicInvoiceDto, InvoiceLineDto } from '../dto/create-electronic-invoice.dto';
import { XmlGeneratorService } from './xml-generator.service';
import { AccessKeyGeneratorService } from './access-key-generator.service';
import { TaxCalculationService } from './tax-calculation.service';

@Injectable()
export class ElectronicInvoiceService {
  constructor(
    @InjectRepository(ElectronicInvoice)
    private invoiceRepository: Repository<ElectronicInvoice>,
    private xmlGeneratorService: XmlGeneratorService,
    private accessKeyGeneratorService: AccessKeyGeneratorService,
    private taxCalculationService: TaxCalculationService,
    private dataSource: DataSource,
  ) {}

  async create(
    createInvoiceDto: CreateElectronicInvoiceDto,
  ): Promise<ElectronicInvoice> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const subtotal = this.calculateSubtotal(createInvoiceDto.lines);
      const taxAmount = this.calculateTax(createInvoiceDto.lines);
      const total = subtotal + taxAmount;

      let invoiceNumber = createInvoiceDto.invoiceNumber;
      if (!invoiceNumber) {
        invoiceNumber = await this.generateInvoiceNumber(
          createInvoiceDto.issueDate,
          queryRunner,
        );
      }

      const accessKey = this.accessKeyGeneratorService.generateAccessKey(
        new Date(createInvoiceDto.issueDate),
        '01',
        '001',
        '001',
        invoiceNumber.split('-')[2] || '000000001',
        createInvoiceDto.environment || '2',
      );

      const invoice = queryRunner.manager.create(ElectronicInvoice, {
        accessKey,
        invoiceNumber,
        issueDate: new Date(createInvoiceDto.issueDate),
        customerIdentification: createInvoiceDto.customerIdentification,
        customerName: createInvoiceDto.customerName,
        subtotal,
        taxAmount,
        total,
        status: InvoiceStatus.DRAFT,
        environment: createInvoiceDto.environment || '2',
      });

      const xmlContent = this.xmlGeneratorService.generateInvoiceXML(invoice);
      invoice.xmlContent = xmlContent;

      const saved = await queryRunner.manager.save(invoice);
      await queryRunner.commitTransaction();
      return saved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async signInvoice(id: string): Promise<ElectronicInvoice> {
    const invoice = await this.findOne(id);

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Solo se pueden firmar facturas en estado DRAFT');
    }

    const signedXml = await this.signXML(invoice.xmlContent || '');

    invoice.signedXml = signedXml;
    invoice.status = InvoiceStatus.SENT;

    return this.invoiceRepository.save(invoice);
  }

  async authorizeInvoice(id: string, authorizationNumber: string): Promise<ElectronicInvoice> {
    const invoice = await this.findOne(id);

    if (invoice.status !== InvoiceStatus.SENT) {
      throw new BadRequestException('Solo se pueden autorizar facturas enviadas');
    }

    invoice.authorizationNumber = authorizationNumber;
    invoice.authorizationDate = new Date();
    invoice.status = InvoiceStatus.AUTHORIZED;

    return this.invoiceRepository.save(invoice);
  }

  async rejectInvoice(id: string, reason: string): Promise<ElectronicInvoice> {
    const invoice = await this.findOne(id);

    invoice.rejectionReason = reason;
    invoice.status = InvoiceStatus.REJECTED;

    return this.invoiceRepository.save(invoice);
  }

  async findAll(): Promise<ElectronicInvoice[]> {
    return this.invoiceRepository.find({
      order: { issueDate: 'DESC' },
    });
  }

  async findOne(id: string): Promise<ElectronicInvoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
    });

    if (!invoice) {
      throw new NotFoundException(`Factura electrónica con ID ${id} no encontrada`);
    }

    return invoice;
  }

  async findByAccessKey(accessKey: string): Promise<ElectronicInvoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { accessKey },
    });

    if (!invoice) {
      throw new NotFoundException(`Factura con clave de acceso ${accessKey} no encontrada`);
    }

    return invoice;
  }

  private calculateSubtotal(lines: InvoiceLineDto[]): number {
    return lines.reduce((sum, line) => {
      const lineTotal = line.quantity * line.unitPrice - line.discount;
      return sum + lineTotal;
    }, 0);
  }

  private calculateTax(lines: InvoiceLineDto[]): number {
    return lines.reduce((sum, line) => {
      const lineSubtotal = line.quantity * line.unitPrice - line.discount;
      const lineTax = this.taxCalculationService.calculateIVA(
        lineSubtotal,
        line.taxRate,
      );
      return sum + lineTax;
    }, 0);
  }

  private async generateInvoiceNumber(
    date: string,
    queryRunner: any,
  ): Promise<string> {
    const dateObj = new Date(date);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');

    const lastInvoice = await queryRunner.manager
      .createQueryBuilder(ElectronicInvoice, 'invoice')
      .where('invoice.invoiceNumber LIKE :pattern', {
        pattern: `001-001-${year}${month}%`,
      })
      .orderBy('invoice.invoiceNumber', 'DESC')
      .getOne();

    let sequence = 1;

    if (lastInvoice) {
      const parts = lastInvoice.invoiceNumber.split('-');
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

