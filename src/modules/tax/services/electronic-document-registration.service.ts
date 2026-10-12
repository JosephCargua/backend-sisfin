import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ElectronicDocumentRegistration } from '../entities/electronic-document-registration.entity';
import { ElectronicDocumentLineItem } from '../entities/electronic-document-line-item.entity';
import { XmlInvoiceParserService } from './xml-invoice-parser.service';
import { PersonasService } from '../../personas/personas.service';
import { DocumentReviewStatus } from '../enums/document-review-status.enum';
import { DocumentProcessingStatus } from '../enums/document-processing-status.enum';
import { LineMappingType } from '../enums/line-mapping-type.enum';
import { UpdateDocumentReviewDto } from '../dto/update-document-review.dto';
import { HomologateDocumentDto } from '../dto/homologate-document.dto';
import { HomologateLineItemDto } from '../dto/homologate-line-item.dto';
import { UploadedFilePayload } from '../../../common/types/uploaded-file.type';
import { ParsedElectronicDocument } from './xml-invoice-parser.service';
import {
  DocumentStatusFilter,
  DocumentEmissionFilter,
  SearchDocumentsDto,
} from '../dto/search-documents.dto';
import { DocumentConsultView } from '../interfaces/document-consult-view.interface';
import { JournalEntryService } from '../../accounting/services/journal-entry.service';
import { JournalEntryStatus } from '../../accounting/enums/journal-entry-status.enum';

@Injectable()
export class ElectronicDocumentRegistrationService {
  constructor(
    @InjectRepository(ElectronicDocumentRegistration)
    private readonly repository: Repository<ElectronicDocumentRegistration>,
    @InjectRepository(ElectronicDocumentLineItem)
    private readonly lineItemRepository: Repository<ElectronicDocumentLineItem>,
    private readonly xmlParser: XmlInvoiceParserService,
    private readonly journalEntryService: JournalEntryService,
    private readonly personasService: PersonasService,
    private readonly dataSource: DataSource,
  ) {}

  async search(filters: SearchDocumentsDto): Promise<DocumentConsultView[]> {
    const qb = this.repository.createQueryBuilder('doc');

    if (filters.documentNumber) {
      qb.andWhere(
        '(doc.documentNumber ILIKE :docNum OR doc.documentLabel ILIKE :docNum)',
        { docNum: `%${filters.documentNumber}%` },
      );
    }

    if (filters.person) {
      qb.andWhere(
        '(doc.supplierName ILIKE :person OR doc.supplierIdentification ILIKE :person)',
        { person: `%${filters.person}%` },
      );
    }

    if (filters.documentTypeCode && filters.documentTypeCode !== 'ALL') {
      qb.andWhere('doc.documentTypeCode = :typeCode', {
        typeCode: filters.documentTypeCode,
      });
    }

    if (filters.dateFrom) {
      qb.andWhere('doc.issueDate >= :dateFrom', {
        dateFrom: filters.dateFrom,
      });
    }

    if (filters.dateTo) {
      qb.andWhere('doc.issueDate <= :dateTo', { dateTo: filters.dateTo });
    }

    if (filters.personType && filters.personType !== 'ALL' as any) {
      // Assume personType determines whether it's a customer or supplier document
      // In SISFIN, usually document types or other flags determine this, but if we have personType from DTO
      // For simplicity, we might map personType to specific document types or leave it if not explicitly handled in entity yet
      // If the entity doesn't have a personType column, we might just filter by supplier/customer logic if applicable
    }

    if (filters.statusFilter && filters.statusFilter !== DocumentStatusFilter.ALL) {
      if (filters.statusFilter === DocumentStatusFilter.ANNULLED) {
        qb.andWhere('doc.isAnnulled = true');
      } else {
        qb.andWhere('doc.isAnnulled = false');
        if (filters.statusFilter === DocumentStatusFilter.PENDING) {
          qb.andWhere('doc.amountPaid < doc.total');
        } else if (filters.statusFilter === DocumentStatusFilter.COLLECTED || filters.statusFilter === DocumentStatusFilter.PAID) {
          qb.andWhere('doc.amountPaid >= doc.total');
        }
      }
    } else {
      // Default behavior might be not to show annulled unless requested? Or show all?
      // Let's show all if ALL is selected, but usually we don't filter out annulled if 'Todos' is selected.
    }

    if (filters.emissionFilter && filters.emissionFilter !== DocumentEmissionFilter.ALL) {
      if (filters.emissionFilter === DocumentEmissionFilter.ELECTRONICA) {
        qb.andWhere('doc.accessKey IS NOT NULL AND doc.accessKey != \'\'');
      } else if (filters.emissionFilter === DocumentEmissionFilter.FISICA) {
        qb.andWhere('(doc.accessKey IS NULL OR doc.accessKey = \'\')');
      }
    }

    if (filters.purchaseOrder) {
      // If purchaseOrder field exists. The entity might not have purchaseOrder directly in this version.
      // If it doesn't, we can skip or add a where clause if it's stored in a JSON field or similar.
    }

    qb.orderBy('doc.issueDate', 'DESC').addOrderBy('doc.createdAt', 'DESC');

    const docs = await qb.getMany();
    return docs.map((doc) => this.toConsultView(doc));
  }

  async findAll(
    processingStatus?: DocumentProcessingStatus,
  ): Promise<ElectronicDocumentRegistration[]> {
    const where = processingStatus ? { processingStatus } : {};
    return this.repository.find({
      where,
      order: { issueDate: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<ElectronicDocumentRegistration> {
    const doc = await this.repository.findOne({ where: { id } });
    if (!doc) {
      throw new NotFoundException(`Documento con ID ${id} no encontrado`);
    }
    return doc;
  }

  async getLineItems(documentId: string): Promise<ElectronicDocumentLineItem[]> {
    await this.findOne(documentId);
    return this.lineItemRepository.find({
      where: { documentRegistrationId: documentId },
      order: { supplierCode: 'ASC' },
    });
  }

  async uploadFile(
    file: UploadedFilePayload,
    targetInvoiceNumber?: string,
  ): Promise<ElectronicDocumentRegistration> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Archivo vacío o no válido');
    }

    const content = file.buffer.toString('utf-8');
    const isXml =
      file.mimetype?.includes('xml') ||
      file.originalname?.toLowerCase().endsWith('.xml') ||
      content.trim().startsWith('<?xml') ||
      content.includes('<factura') ||
      content.includes('<autorizacion');

    if (!isXml) {
      return this.createFromManualFile(file, content);
    }

    const parsed = this.xmlParser.parse(content);
    const existing = await this.repository.findOne({
      where: { documentNumber: parsed.documentNumber },
    });
    if (existing) {
      throw new BadRequestException(
        `El documento ${parsed.documentNumber} ya está registrado`,
      );
    }

    const effectiveTargetNum = targetInvoiceNumber || parsed.modifiedDocumentNumber;

    let reason = await this.buildUploadReason(parsed);
    if (parsed.documentTypeCode === '04') {
      reason = effectiveTargetNum
        ? `Nota de Crédito que modifica Factura ${effectiveTargetNum}`
        : 'Nota de Crédito (Saldo a Favor del proveedor)';
    } else if (parsed.documentTypeCode === '05') {
      reason = parsed.modifiedDocumentNumber
        ? `Nota de Débito que modifica Factura ${parsed.modifiedDocumentNumber}`
        : 'Nota de Débito';
    } else if (parsed.documentTypeCode === '07') {
      reason = parsed.modifiedDocumentNumber
        ? `Comprobante de Retención para Factura ${parsed.modifiedDocumentNumber}`
        : 'Comprobante de Retención';
    }

    const processingStatus = reason && parsed.documentTypeCode === '01'
      ? DocumentProcessingStatus.PARTIAL
      : DocumentProcessingStatus.PENDING_PROCESS;

    let linkedInvoiceId: string | null = null;
    if (effectiveTargetNum) {
      const linked = await this.repository.findOne({
        where: { documentNumber: effectiveTargetNum },
      });
      if (linked) {
        linkedInvoiceId = linked.id;
      }
    }

    const entity = this.repository.create({
      issueDate: parsed.issueDate,
      authorizationDate: parsed.authorizationDate,
      documentNumber: parsed.documentNumber,
      supplierName: parsed.supplierName,
      supplierIdentification: parsed.supplierIdentification,
      documentTypeCode: parsed.documentTypeCode,
      documentLabel: parsed.documentLabel,
      reviewStatus: DocumentReviewStatus.PENDING_REVIEW,
      processingStatus,
      reason,
      fileName: file.originalname,
      mimeType: file.mimetype,
      xmlContent: parsed.xmlContent,
      accessKey: parsed.accessKey,
      total: parsed.total,
      itemCount: parsed.itemCount,
      modifiedDocumentNumber: effectiveTargetNum ?? null,
      modifiedDocumentType: parsed.modifiedDocumentType ?? null,
      modificationReason: parsed.modificationReason ?? null,
      modifiedDocumentId: linkedInvoiceId,
    });

    const saved = await this.repository.save(entity);
    await this.saveLineItems(saved.id, parsed.lineItems);

    // CRUCE AUTOMÁTICO INMEDIATO AL SUBIR AL SISTEMA
    if (parsed.documentTypeCode === '04') {
      // 1. Si es NOTA DE CRÉDITO:
      let targetDoc: ElectronicDocumentRegistration | null = null;
      if (effectiveTargetNum) {
        targetDoc = await this.repository.findOne({
          where: { documentNumber: effectiveTargetNum },
        });
      }

      // Si no se encontró por número exacto o ya estaba pagada, buscar si el proveedor tiene una factura abierta
      if (!targetDoc || Number(targetDoc.total || 0) <= Number(targetDoc.amountPaid || 0)) {
        const candidateInvoices = await this.repository.find({
          where: {
            supplierIdentification: parsed.supplierIdentification ?? undefined,
            documentTypeCode: '01',
          },
          order: { issueDate: 'DESC' },
        });
        const open = candidateInvoices.find(
          (inv) => Number(inv.total || 0) > Number(inv.amountPaid || 0),
        );
        if (open) {
          targetDoc = open;
        }
      }

      if (targetDoc) {
        const ncTotal = Number(parsed.total || 0);
        const openBalance = Math.max(
          0,
          Number(targetDoc.total || 0) - Number(targetDoc.amountPaid || 0),
        );
        const crossAmount = Math.min(ncTotal, openBalance > 0 ? openBalance : ncTotal);

        if (crossAmount > 0) {
          targetDoc.amountPaid = Number(targetDoc.amountPaid || 0) + crossAmount;
          targetDoc.creditNoteAmount = Number(targetDoc.creditNoteAmount || 0) + crossAmount;
          targetDoc.reason = `NC ${saved.documentNumber} aplicada (-$${crossAmount.toFixed(2)})`;
          await this.repository.save(targetDoc);

          await this.dataSource.query(
            `UPDATE financial_documents 
             SET "amountPaid" = "amountPaid" + $1, "creditNoteAmount" = "creditNoteAmount" + $1 
             WHERE "documentNumber" = $2`,
            [crossAmount, targetDoc.documentNumber],
          );

          await this.dataSource.query(
            `INSERT INTO document_crossings ("sourceDocumentId", "targetDocumentId", "crossingDate", "transactionMethod", "amount", "description", "createdAt")
             VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
            [
              saved.id,
              targetDoc.id,
              parsed.issueDate,
              'Nota de Crédito',
              crossAmount,
              `Cruce automático por NC ${saved.documentNumber} a Factura ${targetDoc.documentNumber}`,
            ],
          );

          await this.dataSource.query(
            `INSERT INTO document_payments ("documentId", "documentType", "amount", "transactionType", "transactionId", "createdAt")
             VALUES ($1, 'FINANCIAL', $2, 'crossing', $3, NOW())`,
            [targetDoc.id, crossAmount, saved.id],
          );

          saved.modifiedDocumentNumber = targetDoc.documentNumber;
          saved.modifiedDocumentId = targetDoc.id;
          saved.reason = `Cruzada con Factura ${targetDoc.documentNumber} (-$${crossAmount.toFixed(2)})`;
          saved.processingStatus = DocumentProcessingStatus.PROCESSED;
          await this.repository.save(saved);
        }
      }
    } else if (parsed.documentTypeCode === '01') {
      // 2. Si es FACTURA:
      const candidateNCs = await this.repository.find({
        where: {
          supplierIdentification: parsed.supplierIdentification ?? undefined,
          documentTypeCode: '04',
        },
      });

      for (const nc of candidateNCs) {
        if (nc.modifiedDocumentNumber === parsed.documentNumber || !nc.modifiedDocumentId) {
          const ncTotal = Number(nc.total || 0);
          const currentBalance = Math.max(
            0,
            Number(saved.total || 0) - Number(saved.amountPaid || 0),
          );
          if (currentBalance > 0 && ncTotal > 0) {
            const applyAmount = Math.min(ncTotal, currentBalance);
            saved.amountPaid = Number(saved.amountPaid || 0) + applyAmount;
            saved.creditNoteAmount = Number(saved.creditNoteAmount || 0) + applyAmount;
            saved.reason = `NC ${nc.documentNumber} aplicada (-$${applyAmount.toFixed(2)})`;
            await this.repository.save(saved);

            nc.modifiedDocumentNumber = saved.documentNumber;
            nc.modifiedDocumentId = saved.id;
            nc.reason = `Cruzada con Factura ${saved.documentNumber} (-$${applyAmount.toFixed(2)})`;
            nc.processingStatus = DocumentProcessingStatus.PROCESSED;
            await this.repository.save(nc);

            await this.dataSource.query(
              `INSERT INTO document_crossings ("sourceDocumentId", "targetDocumentId", "crossingDate", "transactionMethod", "amount", "description", "createdAt")
               VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
              [
                nc.id,
                saved.id,
                saved.issueDate,
                'Nota de Crédito',
                applyAmount,
                `Cruce automático por NC ${nc.documentNumber} a Factura ${saved.documentNumber}`,
              ],
            );
            await this.dataSource.query(
              `INSERT INTO document_payments ("documentId", "documentType", "amount", "transactionType", "transactionId", "createdAt")
               VALUES ($1, 'FINANCIAL', $2, 'crossing', $3, NOW())`,
              [saved.id, applyAmount, nc.id],
            );
          }
        }
      }
    }

    return saved;
  }

  async homologateLineItem(
    documentId: string,
    lineItemId: string,
    dto: HomologateLineItemDto,
  ): Promise<ElectronicDocumentLineItem> {
    const line = await this.lineItemRepository.findOne({
      where: { id: lineItemId, documentRegistrationId: documentId },
    });
    if (!line) {
      throw new NotFoundException('Línea del documento no encontrada');
    }

    if (dto.mappingType === LineMappingType.PRODUCT && !dto.mappedProductId) {
      throw new BadRequestException('Seleccione el producto a homologar');
    }
    if (dto.mappingType === LineMappingType.ACCOUNT && !dto.mappedAccountId) {
      throw new BadRequestException('Seleccione la cuenta a homologar');
    }

    line.mappingType = dto.mappingType;
    line.internalCode = dto.internalCode ?? null;
    line.unit = dto.unit ?? null;
    line.mappedProductId = dto.mappedProductId ?? null;
    line.mappedAccountId = dto.mappedAccountId ?? null;
    line.isHomologated = true;

    return this.lineItemRepository.save(line);
  }

  async updateReviewStatus(
    id: string,
    dto: UpdateDocumentReviewDto,
  ): Promise<ElectronicDocumentRegistration> {
    const doc = await this.findOne(id);
    doc.reviewStatus = dto.reviewStatus;

    if (dto.reviewStatus === DocumentReviewStatus.REVIEWED && !doc.reason) {
      doc.processingStatus = DocumentProcessingStatus.PENDING_PROCESS;
    }

    if (dto.reviewStatus === DocumentReviewStatus.NOT_REVIEWED) {
      doc.processingStatus = DocumentProcessingStatus.PARTIAL;
      if (!doc.reason) {
        doc.reason = 'Documento marcado como no revisado';
      }
    }

    return this.repository.save(doc);
  }

  async homologate(
    id: string,
    dto: HomologateDocumentDto,
  ): Promise<ElectronicDocumentRegistration> {
    const doc = await this.findOne(id);

    doc.payableAccountId = dto.payableAccountId ?? null;
    doc.tipAccountId = dto.tipAccountId ?? null;
    doc.costCenterId = dto.costCenterId ?? null;
    doc.recurringAccountId = dto.recurringAccountId ?? null;
    doc.useRecurringAccount = dto.useRecurringAccount ?? false;
    doc.retentionIrCode = dto.retentionIrCode ?? null;
    doc.retentionIvaCode = dto.retentionIvaCode ?? null;
    doc.generateRetention = dto.generateRetention ?? false;
    doc.updatePersonData = dto.updatePersonData ?? false;
    if (dto.modifiedDocumentNumber !== undefined) {
      doc.modifiedDocumentNumber = dto.modifiedDocumentNumber || null;
    }
    if (dto.modificationReason !== undefined) {
      doc.modificationReason = dto.modificationReason || null;
    }
    doc.reviewStatus = DocumentReviewStatus.REVIEWED;
    doc.processingStatus = DocumentProcessingStatus.PENDING_PROCESS;
    doc.reason = null;

    await this.repository.save(doc);
    return this.processDocument(id);
  }

  async markReadyToProcess(id: string): Promise<ElectronicDocumentRegistration> {
    const doc = await this.findOne(id);
    doc.processingStatus = DocumentProcessingStatus.PENDING_PROCESS;
    doc.reason = null;
    doc.reviewStatus = DocumentReviewStatus.REVIEWED;
    return this.repository.save(doc);
  }

  async processDocument(id: string): Promise<ElectronicDocumentRegistration> {
    const doc = await this.findOne(id);
    
    if (doc.processingStatus === DocumentProcessingStatus.PROCESSED) {
      throw new BadRequestException('El documento ya está procesado');
    }

    // Auto-crear persona si no existe
    let personId: string | null = null;
    if (doc.supplierIdentification) {
      const existingPersonas = await this.personasService.findAll({ filtro: doc.supplierIdentification });
      const exactMatch = existingPersonas.find(p => p.ruc === doc.supplierIdentification || p.cedula === doc.supplierIdentification);
      
      if (exactMatch) {
        personId = exactMatch.id;
      } else {
        try {
          const newPerson = await this.personasService.create({
            nombre: doc.supplierName || 'Persona Sin Nombre',
            ruc: doc.supplierIdentification.length > 10 ? doc.supplierIdentification : undefined,
            cedula: doc.supplierIdentification.length <= 10 ? doc.supplierIdentification : undefined,
            tipo: 'Natural',
            estado: 'Activo',
            esProveedor: true
          });
          personId = newPerson.id;
        } catch (e) {
          console.error('Error creando persona automáticamente:', e);
        }
      }
    }

    // Obtener las líneas homologadas del documento
    const lineItems = await this.getLineItems(id);
    const total = Number(doc.total ?? 0);

    // Calcular subtotal e IVA a partir del total (asumiendo 15% IVA)
    const subtotal15 = total > 0 ? this.round2(total / 1.15) : 0;
    const iva15 = this.round2(total - subtotal15);

    // Construir las líneas del documento financiero
    const financialLines: any[] = [];
    let sortOrder = 0;

    if (doc.useRecurringAccount && doc.recurringAccountId) {
      // Usar cuenta recurrente única con el total
      financialLines.push({
        lineType: 'ACCOUNT',
        sortOrder: sortOrder++,
        data: JSON.stringify({
          quantity: 1,
          accountId: doc.recurringAccountId,
          accountCode: '',
          accountName: '',
          unitValue: subtotal15,
          ivaRate: 15,
          icePercent: 0,
          retIr: '',
          retIva: '',
          discountPercent: 0,
          discount: 0,
          subtotal: subtotal15,
        }),
      });
    } else if (lineItems.length > 0 && lineItems.some(l => l.mappedAccountId)) {
      // Usar líneas homologadas individualmente
      for (const item of lineItems) {
        if (item.mappedAccountId) {
          const lineSubtotal = this.round2(Number(item.unitPrice) * Number(item.quantity));
          financialLines.push({
            lineType: 'ACCOUNT',
            sortOrder: sortOrder++,
            data: JSON.stringify({
              quantity: Number(item.quantity),
              accountId: item.mappedAccountId,
              accountCode: '',
              accountName: '',
              unitValue: Number(item.unitPrice),
              ivaRate: 15,
              icePercent: 0,
              retIr: '',
              retIva: '',
              discountPercent: 0,
              discount: 0,
              subtotal: lineSubtotal,
            }),
          });
        }
      }
    } else if (doc.payableAccountId) {
      // Usar la cuenta por pagar como única línea de gasto con el subtotal
      financialLines.push({
        lineType: 'ACCOUNT',
        sortOrder: sortOrder++,
        data: JSON.stringify({
          quantity: 1,
          accountId: doc.payableAccountId,
          accountCode: '',
          accountName: '',
          unitValue: subtotal15,
          ivaRate: 15,
          icePercent: 0,
          retIr: '',
          retIva: '',
          discountPercent: 0,
          discount: 0,
          subtotal: subtotal15,
        }),
      });
    }

    // Verificar si ya existe un documento financiero con este número
    const existing = await this.dataSource.query(
      `SELECT id FROM financial_documents WHERE "documentNumber" = $1 AND "entryType" = 'PURCHASE_EXPENSE' LIMIT 1`,
      [doc.documentNumber]
    );

    let documentCategory = 'INVOICE';
    if (doc.documentTypeCode === '04') documentCategory = 'CREDIT_NOTE';
    else if (doc.documentTypeCode === '05') documentCategory = 'DEBIT_NOTE';
    else if (doc.documentTypeCode === '07') documentCategory = 'RETENTION';
    else if (doc.documentTypeCode === '03') documentCategory = 'PURCHASE_LIQUIDATION';

    const docDescription = documentCategory === 'CREDIT_NOTE'
      ? `Nota de Crédito ${doc.documentNumber} - ${doc.supplierName} (Modifica FAC ${doc.modifiedDocumentNumber || 'S/N'})`
      : (documentCategory === 'DEBIT_NOTE'
        ? `Nota de Débito ${doc.documentNumber} - ${doc.supplierName} (Modifica FAC ${doc.modifiedDocumentNumber || 'S/N'})`
        : `Factura ${doc.documentNumber} - ${doc.supplierName}`);

    if (existing.length === 0 && financialLines.length > 0) {
      try {
        // Insertar el documento financiero
        const insertDoc = await this.dataSource.query(
          `INSERT INTO financial_documents 
           ("issueDate", "personType", "documentCategory", "entryType", "documentNumber", "authorization",
            "personId", "personName", "personIdentification",
            "subtotal15", "subtotal5", "subtotal0", "discount", "iva15", "iva5", "ice", "total",
            "dueDays", "description", "payWithPettyCash", "modifiedDocumentNumber", "createdAt", "updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$22)
           RETURNING id`,
          [
            doc.issueDate,
            'SUPPLIER',
            documentCategory,
            'PURCHASE_EXPENSE',
            doc.documentNumber,
            doc.accessKey || null,
            personId,
            doc.supplierName,
            doc.supplierIdentification,
            subtotal15,
            0,
            0,
            0,
            iva15,
            0,
            0,
            total,
            0,
            docDescription,
            false,
            doc.modifiedDocumentNumber || null,
            new Date(),
          ]
        );

        const newDocId = insertDoc[0]?.id;
        if (newDocId) {
          for (const line of financialLines) {
            await this.dataSource.query(
              `INSERT INTO financial_document_lines ("documentId", "lineType", "sortOrder", "data")
               VALUES ($1, $2, $3, $4)`,
              [newDocId, line.lineType, line.sortOrder, line.data]
            );
          }

          // LÓGICA DE CRUCE AUTOMÁTICO
          if (documentCategory === 'CREDIT_NOTE' && doc.modifiedDocumentNumber) {
            const crossAmount = Number(doc.total || 0);

            // Buscar la factura de destino en financial_documents
            const finTarget = await this.dataSource.query(
              `SELECT id, "documentNumber", total, "amountPaid" FROM financial_documents WHERE "documentNumber" = $1 LIMIT 1`,
              [doc.modifiedDocumentNumber]
            );

            if (finTarget && finTarget.length > 0) {
              const target = finTarget[0];
              await this.dataSource.query(
                `INSERT INTO document_crossings ("sourceDocumentId", "targetDocumentId", "crossingDate", "transactionMethod", "amount", "description", "createdAt")
                 VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
                [
                  newDocId,
                  target.id,
                  doc.issueDate,
                  'Nota de Crédito',
                  crossAmount,
                  `Cruce automático por NC ${doc.documentNumber} a FAC ${target.documentNumber}`
                ]
              );

              await this.dataSource.query(
                `INSERT INTO document_payments ("documentId", "documentType", "amount", "transactionType", "transactionId", "createdAt")
                 VALUES ($1, 'FINANCIAL', $2, 'crossing', $3, NOW())`,
                [target.id, crossAmount, newDocId]
              );

              await this.dataSource.query(
                `UPDATE financial_documents SET "amountPaid" = "amountPaid" + $1, "creditNoteAmount" = "creditNoteAmount" + $1 WHERE id = $2`,
                [crossAmount, target.id]
              );
            }

            // También actualizar en electronic_document_registrations si existe
            const targetElec = await this.repository.findOne({
              where: { documentNumber: doc.modifiedDocumentNumber }
            });
            if (targetElec) {
              targetElec.amountPaid = Number(targetElec.amountPaid || 0) + crossAmount;
              targetElec.creditNoteAmount = Number(targetElec.creditNoteAmount || 0) + crossAmount;
              targetElec.reason = `NC ${doc.documentNumber} aplicada (-$${crossAmount.toFixed(2)})`;
              await this.repository.save(targetElec);
            }

            doc.reason = `Cruzada con Factura ${doc.modifiedDocumentNumber} (-$${crossAmount.toFixed(2)})`;
          } else if (documentCategory === 'INVOICE') {
            // Verificar si previamente se cargaron Notas de Crédito para esta factura
            const existingNCs = await this.dataSource.query(
              `SELECT id, "documentNumber", total FROM electronic_document_registrations 
               WHERE ("modifiedDocumentNumber" = $1 OR ("documentNumber" = $2 AND $2 != '')) 
                 AND "documentTypeCode" = '04'`,
              [doc.documentNumber, doc.modifiedDocumentNumber || ''],
            );

            let totalNCApplied = 0;
            for (const nc of existingNCs) {
              const crossAmount = Number(nc.total || 0);
              if (crossAmount > 0) {
                await this.dataSource.query(
                  `INSERT INTO document_crossings ("sourceDocumentId", "targetDocumentId", "crossingDate", "transactionMethod", "amount", "description", "createdAt")
                   VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
                  [
                    nc.id,
                    newDocId,
                    doc.issueDate,
                    'Nota de Crédito',
                    crossAmount,
                    `Cruce automático por NC ${nc.documentNumber}`,
                  ],
                );
                await this.dataSource.query(
                  `INSERT INTO document_payments ("documentId", "documentType", "amount", "transactionType", "transactionId", "createdAt")
                   VALUES ($1, 'FINANCIAL', $2, 'crossing', $3, NOW())`,
                  [newDocId, crossAmount, nc.id],
                );
                await this.dataSource.query(
                  `UPDATE financial_documents SET "amountPaid" = "amountPaid" + $1, "creditNoteAmount" = "creditNoteAmount" + $1 WHERE id = $2`,
                  [crossAmount, newDocId],
                );
                await this.dataSource.query(
                  `UPDATE electronic_document_registrations 
                   SET "modifiedDocumentNumber" = $1, "modifiedDocumentId" = $2, reason = $3, "processingStatus" = 'PROCESSED'
                   WHERE id = $4`,
                  [
                    doc.documentNumber,
                    doc.id,
                    `Cruzada con Factura ${doc.documentNumber} (-$${crossAmount.toFixed(2)})`,
                    nc.id,
                  ],
                );
                totalNCApplied += crossAmount;
              }
            }
            if (totalNCApplied > 0) {
              doc.amountPaid = Number(doc.amountPaid || 0) + totalNCApplied;
              doc.creditNoteAmount = Number(doc.creditNoteAmount || 0) + totalNCApplied;
              doc.reason = `NC aplicada (-$${totalNCApplied.toFixed(2)})`;
            }
          }
        }
      } catch (e) {
        console.error('Error al crear el documento financiero automáticamente:', e);
      }
    }

    doc.processingStatus = DocumentProcessingStatus.PROCESSED;
    return this.repository.save(doc);
  }

  async remove(id: string): Promise<void> {
    const doc = await this.findOne(id);
    await this.revertCrossingsForDocument(doc);
    await this.lineItemRepository.delete({ documentRegistrationId: id });
    try {
      await this.dataSource.query(
        `DELETE FROM financial_document_lines WHERE "financialDocumentId" IN (SELECT id FROM financial_documents WHERE "documentNumber" = $1)`,
        [doc.documentNumber],
      );
      await this.dataSource.query(
        `DELETE FROM financial_documents WHERE "documentNumber" = $1`,
        [doc.documentNumber],
      );
    } catch (e) {
      console.error('Error limpiando financial_documents:', e);
    }
    await this.repository.remove(doc);
  }

  async annulDocument(id: string): Promise<ElectronicDocumentRegistration> {
    const doc = await this.findOne(id);
    if (doc.isAnnulled) {
      throw new BadRequestException('El documento ya se encuentra anulado');
    }
    await this.revertCrossingsForDocument(doc);
    doc.isAnnulled = true;
    doc.annulledDate = new Date();
    return this.repository.save(doc);
  }

  async revertCrossingsForDocument(doc: ElectronicDocumentRegistration): Promise<void> {
    try {
      // 1. Si era una Nota de Crédito cruzada (origen):
      const sourceCrossings = await this.dataSource.query(
        `SELECT * FROM document_crossings WHERE "sourceDocumentId" = $1`,
        [doc.id],
      );

      for (const cross of sourceCrossings) {
        const amount = Number(cross.amount || 0);
        const targetId = cross.targetDocumentId;

        if (amount > 0 && targetId) {
          // Revertir en financial_documents
          await this.dataSource.query(
            `UPDATE financial_documents 
             SET "amountPaid" = GREATEST(0, "amountPaid" - $1), 
                 "creditNoteAmount" = GREATEST(0, "creditNoteAmount" - $1) 
             WHERE id = $2 OR "documentNumber" = (SELECT "documentNumber" FROM electronic_document_registrations WHERE id = $2)`,
            [amount, targetId],
          );

          // Revertir en electronic_document_registrations
          await this.dataSource.query(
            `UPDATE electronic_document_registrations 
             SET "amountPaid" = GREATEST(0, "amountPaid" - $1), 
                 "creditNoteAmount" = GREATEST(0, "creditNoteAmount" - $1),
                 reason = NULL
             WHERE id = $2`,
            [amount, targetId],
          );
        }
      }

      // 2. Si era la Factura a la que le aplicaron notas de crédito (destino):
      const targetCrossings = await this.dataSource.query(
        `SELECT * FROM document_crossings WHERE "targetDocumentId" = $1`,
        [doc.id],
      );

      for (const cross of targetCrossings) {
        const sourceId = cross.sourceDocumentId;
        if (sourceId) {
          await this.dataSource.query(
            `UPDATE electronic_document_registrations 
             SET "modifiedDocumentNumber" = NULL, "modifiedDocumentId" = NULL, reason = 'Saldo a Favor disponible'
             WHERE id = $1`,
            [sourceId],
          );
        }
      }

      // 3. Eliminar pagos asociados de tipo 'crossing'
      await this.dataSource.query(
        `DELETE FROM document_payments WHERE "transactionId" = $1 OR "documentId" = $1`,
        [doc.id],
      );

      // 4. Eliminar registros de cruce
      await this.dataSource.query(
        `DELETE FROM document_crossings WHERE "sourceDocumentId" = $1 OR "targetDocumentId" = $1`,
        [doc.id],
      );
    } catch (e) {
      console.error('Error revirtiendo cruces para documento:', e);
    }
  }

  private toConsultView(doc: ElectronicDocumentRegistration): DocumentConsultView {
    const total = Number(doc.total ?? 0);
    const netAmount = total > 0 ? total / 1.15 : 0;
    const taxAmount = total > 0 ? total - netAmount : 0;
    let retentionAmount = Number(doc.retentionAmountApplied ?? 0);
    if (retentionAmount === 0) {
      if (doc.generateRetention && doc.retentionIrCode) {
        retentionAmount += netAmount * 0.01;
      }
      if (doc.generateRetention && doc.retentionIvaCode) {
        retentionAmount += taxAmount * 0.3;
      }
    }

    const creditNoteAmount = Number(doc.creditNoteAmount ?? 0);
    const debitNoteAmount = Number(doc.debitNoteAmount ?? 0);
    const amountPaid = Number(doc.amountPaid ?? 0);
    const balance = Math.max(0, Math.round(((total + debitNoteAmount) - amountPaid) * 100) / 100);
    const isPaid = balance <= 0 && total > 0;

    return {
      id: doc.id,
      issueDate: doc.issueDate,
      authorizationDate: doc.authorizationDate,
      supplierName: doc.supplierName,
      supplierIdentification: doc.supplierIdentification,
      documentLabel: doc.documentLabel,
      documentNumber: doc.documentNumber,
      documentTypeCode: doc.documentTypeCode,
      reviewStatus: doc.reviewStatus,
      processingStatus: doc.processingStatus,
      accessKey: doc.accessKey,
      netAmount: Math.round(netAmount * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: Math.round(total * 100) / 100,
      amountPaid: Math.round(amountPaid * 100) / 100,
      balance: balance,
      isPaid: isPaid,
      retentionAmount: Math.round(retentionAmount * 100) / 100,
      statusLabel: this.getStatusLabel(doc),
      personTypeLabel: 'Proveedor',
      payableAccountId: doc.payableAccountId,
      tipAccountId: doc.tipAccountId,
      costCenterId: doc.costCenterId,
      recurringAccountId: doc.recurringAccountId,
      useRecurringAccount: doc.useRecurringAccount,
      retentionIrCode: doc.retentionIrCode,
      retentionIvaCode: doc.retentionIvaCode,
      generateRetention: doc.generateRetention,
      updatePersonData: doc.updatePersonData,
      isAnnulled: doc.isAnnulled,
      annulledDate: doc.annulledDate,
      modifiedDocumentNumber: doc.modifiedDocumentNumber,
      modifiedDocumentType: doc.modifiedDocumentType,
      modificationReason: doc.modificationReason,
      creditNoteAmount: Math.round(creditNoteAmount * 100) / 100,
      retentionAmountApplied: Math.round(retentionAmount * 100) / 100,
      debitNoteAmount: Math.round(debitNoteAmount * 100) / 100,
    };
  }

  private getStatusLabel(doc: ElectronicDocumentRegistration): string {
    if (doc.processingStatus === DocumentProcessingStatus.PROCESSED) {
      return 'Procesado';
    }
    if (doc.processingStatus === DocumentProcessingStatus.PENDING_PROCESS) {
      return 'Por procesar';
    }
    if (doc.reviewStatus === DocumentReviewStatus.REVIEWED) {
      return 'Revisado';
    }
    if (doc.reviewStatus === DocumentReviewStatus.NOT_REVIEWED) {
      return 'No revisado';
    }
    return 'Pendiente';
  }

  private async saveLineItems(
    documentId: string,
    items: ParsedElectronicDocument['lineItems'],
  ): Promise<void> {
    const rows =
      items.length > 0
        ? items
        : [
            {
              supplierCode: '1',
              supplierDescription: 'Ítem del documento',
              ivaLabel: '0%',
              quantity: 1,
              unitPrice: 0,
            },
          ];

    const entities = rows.map((item) =>
      this.lineItemRepository.create({
        documentRegistrationId: documentId,
        supplierCode: item.supplierCode,
        supplierDescription: item.supplierDescription,
        ivaLabel: item.ivaLabel,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        isHomologated: item.supplierCode === 'TXT', // Auto-homologar consolidado TXT
      }),
    );

    await this.lineItemRepository.save(entities);
  }

  private async buildUploadReason(
    parsed: ParsedElectronicDocument,
  ): Promise<string | null> {
    const reasons: string[] = [];

    if (!parsed.supplierIdentification) {
      reasons.push(
        'Se requiere de una actualización de datos para el procesamiento completo del documento',
      );
    }

    if (parsed.supplierIdentification) {
      const lastDoc = await this.repository.findOne({
        where: { supplierIdentification: parsed.supplierIdentification },
        order: { createdAt: 'DESC' },
      });
      if (lastDoc && lastDoc.itemCount !== parsed.itemCount) {
        reasons.push(
          'Diferencia de items entre el documento actual y el último documento generado de este proveedor',
        );
      }
    }

    if (!parsed.authorizationDate) {
      reasons.push('Documento sin fecha de autorización registrada en el XML');
    }

    // Ignorar ítems que son del consolidado TXT (ya nacen homologados)
    const pendingItems = parsed.lineItems.filter(l => l.supplierCode !== 'TXT');
    if (pendingItems.length > 0) {
      reasons.push(
        'Existen productos del proveedor pendientes de homologación',
      );
    }

    return reasons.length > 0 ? reasons.join('. ') : null;
  }

  private async createFromManualFile(
    file: UploadedFilePayload,
    content: string,
  ): Promise<ElectronicDocumentRegistration> {
    const entity = this.repository.create({
      issueDate: new Date(),
      authorizationDate: null,
      documentNumber: `MAN-${Date.now()}`,
      supplierName: file.originalname.replace(/\.[^.]+$/, ''),
      supplierIdentification: null,
      documentTypeCode: '00',
      documentLabel: `DOC ${file.originalname}`,
      reviewStatus: DocumentReviewStatus.PENDING_REVIEW,
      processingStatus: DocumentProcessingStatus.PARTIAL,
      reason:
        'Se requiere de una actualización de datos para el procesamiento completo del documento',
      fileName: file.originalname,
      mimeType: file.mimetype,
      xmlContent: content.substring(0, 50000),
      accessKey: null,
      total: null,
      itemCount: 1,
    });

    const saved = await this.repository.save(entity);
    await this.saveLineItems(saved.id, []);
    return saved;
  }

  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
