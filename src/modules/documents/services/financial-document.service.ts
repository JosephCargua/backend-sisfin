import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { FinancialDocument } from '../entities/financial-document.entity';
import { FinancialDocumentLine } from '../entities/financial-document-line.entity';
import { CreateFinancialDocumentDto } from '../dto/create-financial-document.dto';
import { FinancialDocumentLineType } from '../enums/financial-document-line-type.enum';
import { DocumentEntryType } from '../enums/document-entry-type.enum';
import { XmlInvoiceParserService } from '../../tax/services/xml-invoice-parser.service';
import { UploadedFilePayload } from '../../../common/types/uploaded-file.type';
import { JournalEntryService } from '../../accounting/services/journal-entry.service';

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
    private readonly journalEntryService: JournalEntryService,
    private readonly dataSource: DataSource,
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

    const savedDocument = await this.documentRepository.save(entity);

    // Create Journal Entry if we have account lines (even if not petty cash)
    if (dto.lines.some(l => l.lineType === FinancialDocumentLineType.ACCOUNT)) {
      try {
        const jeLines = [];
        let totalDebit = 0;
        let totalCredit = 0;

        // Debit Expenses (Account Lines)
        const accountLines = dto.lines.filter(l => l.lineType === FinancialDocumentLineType.ACCOUNT);
        for (const line of accountLines) {
          const data = line.data as any;
          if (data.accountId) {
             const subtotal = Number(data.subtotal) || 0;
             jeLines.push({ accountId: data.accountId, debit: subtotal, credit: 0, description: `Gasto/Compra ${dto.documentNumber}` });
             totalDebit += subtotal;
          }
        }

        // Debit IVA
        if (totals.iva15 > 0 || totals.iva5 > 0) {
           const totalIva = totals.iva15 + totals.iva5;
           let ivaAccountId = null;
           try {
             // Find the IVA COMPRAS account
             const res = await this.dataSource.query(`SELECT id FROM accounts WHERE name ILIKE '%IVA COMPRAS%' LIMIT 1`);
             if (res && res.length > 0) ivaAccountId = res[0].id;
           } catch(e) {
             console.error('Error finding IVA account', e);
           }
           
           if (ivaAccountId) {
              jeLines.push({ accountId: ivaAccountId, debit: totalIva, credit: 0, description: `IVA Compras Doc: ${dto.documentNumber}` });
              totalDebit += totalIva;
           } else {
              // Si no existe la cuenta, agregarlo a la primera línea de gasto
              if (jeLines.length > 0) {
                jeLines[0].debit += totalIva;
                totalDebit += totalIva;
              }
           }
        }

        // Credit Caja o Cuentas por Pagar
        const totalPaid = totals.total;
        let creditAccountId = dto.pettyCashAccountId;
        
        if (dto.payWithPettyCash && dto.pettyCashAccountId) {
          try {
            const res = await this.dataSource.query(`SELECT "accountId" FROM cash_accounts WHERE id = $1`, [dto.pettyCashAccountId]);
            if (res && res.length > 0 && res[0].accountId) {
               creditAccountId = res[0].accountId;
            }
          } catch (e) {
            console.error('Error resolving cash account ID:', e);
          }
        } else {
          // Find "Cuentas por Pagar" or similar if not paying with petty cash
          try {
             const res = await this.dataSource.query(`SELECT id FROM accounts WHERE name ILIKE '%CUENTAS POR PAGAR%' OR name ILIKE '%PROVEEDOR%' LIMIT 1`);
             if (res && res.length > 0) creditAccountId = res[0].id;
          } catch (e) {
             console.error('Error finding AP account', e);
          }
        }

        if (creditAccountId) {
          jeLines.push({ accountId: creditAccountId, debit: 0, credit: totalPaid, description: `Provisión/Pago Doc: ${dto.documentNumber}` });
          totalCredit += totalPaid;
        }

        // Adjust differences
        if (totalDebit < totalCredit && jeLines.length > 1) {
           jeLines[0].debit += (totalCredit - totalDebit);
        } else if (totalDebit > totalCredit && creditAccountId) {
           jeLines[jeLines.length - 1].credit += (totalDebit - totalCredit);
        }

        // Create Journal Entry only if valid and we have lines
        if (jeLines.length >= 2 && jeLines[0].accountId && jeLines[jeLines.length - 1].accountId) {
          await this.journalEntryService.create({
            date: new Date(dto.issueDate).toISOString(),
            description: `Registro/Pago Compra Doc: ${dto.documentNumber}`,
            reference: dto.documentNumber,
            lines: jeLines
          });
        }
      } catch (err) {
        console.error('Failed to create journal entry for purchase:', err);
      }
    }

    return savedDocument;
  }

  async parseXmlFile(file: UploadedFilePayload) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Archivo vacío o no válido');
    }
    const content = file.buffer.toString('utf-8');
    const parsed = this.xmlParser.parse(content);

    let homologation: any = null;
    let homologationLines: any[] = [];
    try {
      const docs = await this.dataSource.query(`SELECT id, "payableAccountId", "tipAccountId", "costCenterId" FROM electronic_document_registrations WHERE "accessKey" = $1 LIMIT 1`, [parsed.accessKey]);
      if (docs && docs.length > 0) {
        homologation = docs[0];
        homologationLines = await this.dataSource.query(`SELECT "supplierCode", "mappedAccountId", "mappedProductId" FROM electronic_document_line_items WHERE "documentId" = $1`, [homologation.id]);
      }
    } catch (e) {
      console.error('Error fetching homologation data', e);
    }

    const serviceLines = parsed.lineItems.map((item, index) => {
      const ivaRate = this.parseIvaRate(item.ivaLabel);
      const subtotal = item.quantity * item.unitPrice;

      let mappedAccountId = null;
      let mappedProductId = null;
      if (homologationLines && homologationLines.length > 0) {
        const lineMatch = homologationLines.find(l => l.supplierCode === item.supplierCode);
        if (lineMatch) {
          mappedAccountId = lineMatch.mappedAccountId;
          mappedProductId = lineMatch.mappedProductId;
        }
      }

      const finalAccountId = mappedAccountId || (homologation?.tipAccountId) || null;
      const lineType = finalAccountId ? FinancialDocumentLineType.ACCOUNT : FinancialDocumentLineType.SERVICE;
      
      return {
        lineType,
        sortOrder: index,
        data: {
          quantity: item.quantity,
          productId: lineType === FinancialDocumentLineType.SERVICE ? mappedProductId : undefined,
          productCode: lineType === FinancialDocumentLineType.SERVICE ? (mappedProductId ? item.supplierCode : undefined) : undefined,
          productName: lineType === FinancialDocumentLineType.SERVICE ? (mappedProductId ? item.supplierDescription : undefined) : undefined,
          accountId: lineType === FinancialDocumentLineType.ACCOUNT ? finalAccountId : undefined,
          accountCode: '',
          accountName: '',
          unit: 'UND',
          unitPrice: item.unitPrice,
          unitValue: item.unitPrice, // For account lines
          ivaRate,
          retIr: 0,
          retIva: 0,
          discount: 0,
          extraDiscount: 0,
          subtotal,
          mappedAccountId: finalAccountId,
          mappedProductId,
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
      payableAccountId: homologation?.payableAccountId || null,
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
