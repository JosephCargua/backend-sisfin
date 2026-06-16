import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ElectronicDocumentRegistration } from '../entities/electronic-document-registration.entity';
import { ElectronicDocumentLineItem } from '../entities/electronic-document-line-item.entity';
import { XmlInvoiceParserService } from './xml-invoice-parser.service';
import { DocumentReviewStatus } from '../enums/document-review-status.enum';
import { DocumentProcessingStatus } from '../enums/document-processing-status.enum';
import { LineMappingType } from '../enums/line-mapping-type.enum';
import { UpdateDocumentReviewDto } from '../dto/update-document-review.dto';
import { HomologateDocumentDto } from '../dto/homologate-document.dto';
import { HomologateLineItemDto } from '../dto/homologate-line-item.dto';
import { UploadedFilePayload } from '../../../common/types/uploaded-file.type';
import { ParsedElectronicDocument } from './xml-invoice-parser.service';
import {
  DocumentQuickFilter,
  SearchDocumentsDto,
} from '../dto/search-documents.dto';
import { DocumentConsultView } from '../interfaces/document-consult-view.interface';

@Injectable()
export class ElectronicDocumentRegistrationService {
  constructor(
    @InjectRepository(ElectronicDocumentRegistration)
    private readonly repository: Repository<ElectronicDocumentRegistration>,
    @InjectRepository(ElectronicDocumentLineItem)
    private readonly lineItemRepository: Repository<ElectronicDocumentLineItem>,
    private readonly xmlParser: XmlInvoiceParserService,
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

    if (filters.reviewStatus) {
      qb.andWhere('doc.reviewStatus = :reviewStatus', {
        reviewStatus: filters.reviewStatus,
      });
    }

    if (filters.processingStatus) {
      qb.andWhere('doc.processingStatus = :processingStatus', {
        processingStatus: filters.processingStatus,
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

    if (filters.quickFilter === DocumentQuickFilter.ELECTRONIC) {
      qb.andWhere('doc.accessKey IS NOT NULL');
    }

    if (filters.quickFilter === DocumentQuickFilter.UNAUTHORIZED) {
      qb.andWhere('doc.authorizationDate IS NULL');
    }

    if (filters.quickFilter === DocumentQuickFilter.RETENTION_PENDING) {
      qb.andWhere('doc.generateRetention = true');
      qb.andWhere('doc.processingStatus = :partial', {
        partial: DocumentProcessingStatus.PARTIAL,
      });
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

    const reason = await this.buildUploadReason(parsed);
    const processingStatus = reason
      ? DocumentProcessingStatus.PARTIAL
      : DocumentProcessingStatus.PENDING_PROCESS;

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
    });

    const saved = await this.repository.save(entity);
    await this.saveLineItems(saved.id, parsed.lineItems);
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

    if (!dto.payableAccountId) {
      throw new BadRequestException(
        'La cuenta por pagar es obligatoria para homologar',
      );
    }

    const pendingCount = await this.lineItemRepository.count({
      where: { documentRegistrationId: id, isHomologated: false },
    });
    if (pendingCount > 0) {
      throw new BadRequestException(
        'Debe homologar todos los productos del proveedor antes de finalizar',
      );
    }

    doc.payableAccountId = dto.payableAccountId ?? null;
    doc.tipAccountId = dto.tipAccountId ?? null;
    doc.costCenterId = dto.costCenterId ?? null;
    doc.recurringAccountId = dto.recurringAccountId ?? null;
    doc.useRecurringAccount = dto.useRecurringAccount ?? false;
    doc.retentionIrCode = dto.retentionIrCode ?? null;
    doc.retentionIvaCode = dto.retentionIvaCode ?? null;
    doc.generateRetention = dto.generateRetention ?? false;
    doc.updatePersonData = dto.updatePersonData ?? false;
    doc.reviewStatus = DocumentReviewStatus.REVIEWED;
    doc.processingStatus = DocumentProcessingStatus.PENDING_PROCESS;
    doc.reason = null;

    return this.repository.save(doc);
  }

  async markReadyToProcess(id: string): Promise<ElectronicDocumentRegistration> {
    const doc = await this.findOne(id);
    doc.processingStatus = DocumentProcessingStatus.PENDING_PROCESS;
    doc.reason = null;
    doc.reviewStatus = DocumentReviewStatus.REVIEWED;
    return this.repository.save(doc);
  }

  async remove(id: string): Promise<void> {
    const doc = await this.findOne(id);
    await this.repository.remove(doc);
  }

  private toConsultView(doc: ElectronicDocumentRegistration): DocumentConsultView {
    const total = Number(doc.total ?? 0);
    const netAmount = total > 0 ? total / 1.15 : 0;
    const taxAmount = total > 0 ? total - netAmount : 0;
    let retentionAmount = 0;
    if (doc.generateRetention && doc.retentionIrCode) {
      retentionAmount = netAmount * 0.01;
    }
    if (doc.generateRetention && doc.retentionIvaCode) {
      retentionAmount += taxAmount * 0.3;
    }

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
      retentionAmount: Math.round(retentionAmount * 100) / 100,
      statusLabel: this.getStatusLabel(doc),
      personTypeLabel: 'Proveedor',
    };
  }

  private getStatusLabel(doc: ElectronicDocumentRegistration): string {
    if (doc.processingStatus === DocumentProcessingStatus.PENDING_PROCESS) {
      return 'Procesado';
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
        isHomologated: false,
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

    if (parsed.lineItems.length > 0) {
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
}
