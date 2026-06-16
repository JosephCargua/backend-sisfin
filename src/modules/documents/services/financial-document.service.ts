import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialDocument } from '../entities/financial-document.entity';
import { FinancialDocumentLine } from '../entities/financial-document-line.entity';
import { CreateFinancialDocumentDto } from '../dto/create-financial-document.dto';
import { FinancialDocumentLineType } from '../enums/financial-document-line-type.enum';
import { DocumentEntryType } from '../enums/document-entry-type.enum';
import { XmlInvoiceParserService } from '../../tax/services/xml-invoice-parser.service';
import { UploadedFilePayload } from '../../../common/types/uploaded-file.type';

interface ServiceLineData {
  quantity?: number;
  unitPrice?: number;
  ivaRate?: number;
  discount?: number;
  extraDiscount?: number;
}

@Injectable()
export class FinancialDocumentService {
  constructor(
    @InjectRepository(FinancialDocument)
    private readonly documentRepository: Repository<FinancialDocument>,
    @InjectRepository(FinancialDocumentLine)
    private readonly lineRepository: Repository<FinancialDocumentLine>,
    private readonly xmlParser: XmlInvoiceParserService,
  ) {}

  async findAll(): Promise<FinancialDocument[]> {
    return this.documentRepository.find({
      order: { issueDate: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<FinancialDocument> {
    const doc = await this.documentRepository.findOne({ where: { id } });
    if (!doc) {
      throw new NotFoundException(`Documento ${id} no encontrado`);
    }
    return doc;
  }

  async create(dto: CreateFinancialDocumentDto): Promise<FinancialDocument> {
    const existing = await this.documentRepository.findOne({
      where: {
        documentNumber: dto.documentNumber,
        entryType: dto.entryType,
      },
    });
    if (existing) {
      throw new BadRequestException(
        `El documento ${dto.documentNumber} ya está registrado`,
      );
    }

    const totals = this.calculateTotalsFromLines(dto.lines);
    const entity = this.documentRepository.create({
      issueDate: new Date(dto.issueDate),
      personType: dto.personType,
      documentCategory: dto.documentCategory,
      entryType: dto.entryType,
      documentNumber: dto.documentNumber,
      authorization: dto.authorization ?? null,
      personId: dto.personId ?? null,
      personName: dto.personName ?? null,
      personIdentification: dto.personIdentification ?? null,
      reference: dto.reference ?? null,
      dueDays: dto.dueDays ?? 0,
      purchaseOrderRef: dto.purchaseOrderRef ?? null,
      seller: dto.seller ?? null,
      description: dto.description ?? null,
      payWithPettyCash: dto.payWithPettyCash ?? false,
      pettyCashAccountId: dto.pettyCashAccountId ?? null,
      ice: dto.ice ?? 0,
      ...totals,
      lines: dto.lines.map((line, index) =>
        this.lineRepository.create({
          lineType: line.lineType,
          sortOrder: line.sortOrder ?? index,
          data: line.data,
        }),
      ),
    });

    return this.documentRepository.save(entity);
  }

  parseXmlFile(file: UploadedFilePayload) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Archivo vacío o no válido');
    }
    const content = file.buffer.toString('utf-8');
    const parsed = this.xmlParser.parse(content);

    const serviceLines = parsed.lineItems.map((item, index) => {
      const ivaRate = this.parseIvaRate(item.ivaLabel);
      const subtotal = item.quantity * item.unitPrice;
      return {
        lineType: FinancialDocumentLineType.SERVICE,
        sortOrder: index,
        data: {
          quantity: item.quantity,
          productCode: item.supplierCode,
          productName: item.supplierDescription,
          unit: 'UND',
          unitPrice: item.unitPrice,
          ivaRate,
          retIr: 0,
          retIva: 0,
          discount: 0,
          extraDiscount: 0,
          subtotal,
        },
      };
    });

    return {
      issueDate: parsed.issueDate.toISOString().slice(0, 10),
      documentNumber: parsed.documentNumber,
      authorization: parsed.accessKey,
      personName: parsed.supplierName,
      personIdentification: parsed.supplierIdentification,
      documentCategory: 'INVOICE',
      lines: serviceLines,
      totals: {
        subtotal15: 0,
        subtotal5: 0,
        subtotal0: 0,
        discount: 0,
        iva15: 0,
        iva5: 0,
        ice: 0,
        total: parsed.total ?? 0,
      },
    };
  }

  private parseIvaRate(label: string): number {
    const match = label.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  private calculateTotalsFromLines(
    lines: CreateFinancialDocumentDto['lines'],
  ) {
    let subtotal15 = 0;
    let subtotal5 = 0;
    let subtotal0 = 0;
    let discount = 0;
    let iva15 = 0;
    let iva5 = 0;

    const serviceLines = lines.filter(
      (l) => l.lineType === FinancialDocumentLineType.SERVICE,
    );

    for (const line of serviceLines) {
      const data = line.data as ServiceLineData;
      const qty = Number(data.quantity) || 0;
      const price = Number(data.unitPrice) || 0;
      const lineDiscount =
        (Number(data.discount) || 0) + (Number(data.extraDiscount) || 0);
      const base = qty * price - lineDiscount;
      const rate = Number(data.ivaRate) || 0;

      discount += lineDiscount;

      if (rate === 15) {
        subtotal15 += base;
        iva15 += base * 0.15;
      } else if (rate === 5) {
        subtotal5 += base;
        iva5 += base * 0.05;
      } else {
        subtotal0 += base;
      }
    }

    const total = subtotal15 + subtotal5 + subtotal0 + iva15 + iva5;

    return {
      subtotal15: this.round2(subtotal15),
      subtotal5: this.round2(subtotal5),
      subtotal0: this.round2(subtotal0),
      discount: this.round2(discount),
      iva15: this.round2(iva15),
      iva5: this.round2(iva5),
      total: this.round2(total),
    };
  }

  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
