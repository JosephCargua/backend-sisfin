import { DocumentProcessingStatus } from '../enums/document-processing-status.enum';
import { DocumentReviewStatus } from '../enums/document-review-status.enum';

export interface DocumentConsultView {
  id: string;
  issueDate: Date;
  authorizationDate: Date | null;
  supplierName: string;
  supplierIdentification: string | null;
  documentLabel: string;
  documentNumber: string;
  documentTypeCode: string;
  reviewStatus: DocumentReviewStatus;
  processingStatus: DocumentProcessingStatus;
  accessKey: string | null;
  netAmount: number;
  taxAmount: number;
  total: number;
  retentionAmount: number;
  statusLabel: string;
  personTypeLabel: string;
  payableAccountId?: string | null;
  tipAccountId?: string | null;
  costCenterId?: string | null;
  recurringAccountId?: string | null;
  useRecurringAccount?: boolean;
  retentionIrCode?: string | null;
  retentionIvaCode?: string | null;
  generateRetention?: boolean;
  updatePersonData?: boolean;
}
