import { IsEnum } from 'class-validator';
import { DocumentReviewStatus } from '../enums/document-review-status.enum';

export class UpdateDocumentReviewDto {
  @IsEnum(DocumentReviewStatus)
  reviewStatus: DocumentReviewStatus;
}
