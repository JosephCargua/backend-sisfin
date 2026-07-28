import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  DocumentPayment,
  DocumentPaymentType,
} from '../entities/document-payment.entity';
import { FinancialDocument } from '../entities/financial-document.entity';
import { ElectronicDocumentRegistration } from '../../tax/entities/electronic-document-registration.entity';

@Injectable()
export class DocumentPaymentService {
  constructor(
    @InjectRepository(DocumentPayment)
    private readonly paymentRepository: Repository<DocumentPayment>,
    @InjectRepository(FinancialDocument)
    private readonly financialRepo: Repository<FinancialDocument>,
    @InjectRepository(ElectronicDocumentRegistration)
    private readonly electronicRepo: Repository<ElectronicDocumentRegistration>,
    private readonly dataSource: DataSource,
  ) {}

  async create(data: Partial<DocumentPayment>): Promise<DocumentPayment> {
    const payment = this.paymentRepository.create(data);
    const saved = await this.paymentRepository.save(payment);

    await this.updateDocumentAmountPaid(saved.documentId, saved.documentType);
    return saved;
  }

  async findAll(): Promise<any[]> {
    const payments = await this.paymentRepository.find({
      order: { createdAt: 'DESC' }
    });

    const enriched = await Promise.all(payments.map(async (p) => {
      let docNumber = '';
      let personName = '';
      let paymentMethod = 'Caja';
      if (p.transactionType === 'bank' && p.transactionId) {
        const res = await this.dataSource.query(`SELECT "paymentMethod" FROM bank_transactions WHERE id = $1`, [p.transactionId]);
        if (res && res.length > 0) {
          paymentMethod = res[0].paymentMethod || 'Banco';
        }
      }

      if (p.documentType === DocumentPaymentType.FINANCIAL) {
        const doc = await this.financialRepo.findOne({ where: { id: p.documentId } });
        if (doc) {
          docNumber = doc.documentNumber;
          personName = doc.personName || '';
        }
      } else {
        const doc = await this.electronicRepo.findOne({ where: { id: p.documentId } });
        if (doc) {
          docNumber = doc.documentNumber;
          personName = doc.supplierName || '';
        }
      }
      return {
        ...p,
        docNumber,
        personName,
        paymentMethod
      };
    }));
    return enriched;
  }

  async revertByDocument(documentId: string): Promise<void> {
    const payments = await this.paymentRepository.find({
      where: { documentId },
    });
    if (payments.length > 0) {
      const docType = payments[0].documentType;

      // Anular transacciones relacionadas
      for (const p of payments) {
        if (p.transactionType === 'bank' && p.transactionId) {
          await this.dataSource.query(
            `UPDATE bank_transactions SET "isAnnulled" = true WHERE id = $1`,
            [p.transactionId],
          );
        } else if (p.transactionType === 'journal' && p.transactionId) {
          await this.dataSource.query(
            `UPDATE journal_entries SET status = 'CANCELLED', "cancellationReason" = 'Pago eliminado', "cancelledAt" = NOW() WHERE id = $1`,
            [p.transactionId],
          );
        }
      }

      await this.paymentRepository.remove(payments);
      await this.updateDocumentAmountPaid(documentId, docType);
    }
  }

  private async updateDocumentAmountPaid(
    documentId: string,
    documentType: DocumentPaymentType,
  ) {
    const payments = await this.paymentRepository.find({
      where: { documentId },
    });
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    if (documentType === DocumentPaymentType.FINANCIAL) {
      const doc = await this.financialRepo.findOne({ where: { id: documentId } });
      if (doc) {
        doc.amountPaid = totalPaid;
        await this.financialRepo.save(doc);
      }
    } else {
      const doc = await this.electronicRepo.findOne({
        where: { id: documentId },
      });
      if (doc) {
        doc.amountPaid = totalPaid;
        await this.electronicRepo.save(doc);
      }
    }
  }

  async getByDocument(documentId: string): Promise<DocumentPayment[]> {
    return this.paymentRepository.find({ where: { documentId } });
  }
}
