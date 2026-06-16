import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ElectronicDocumentRegistrationService } from '../services/electronic-document-registration.service';
import { DocumentProcessingStatus } from '../enums/document-processing-status.enum';
import { UpdateDocumentReviewDto } from '../dto/update-document-review.dto';
import { HomologateDocumentDto } from '../dto/homologate-document.dto';
import { HomologateLineItemDto } from '../dto/homologate-line-item.dto';
import { UploadedFilePayload } from '../../../common/types/uploaded-file.type';
import { SearchDocumentsDto } from '../dto/search-documents.dto';

@ApiTags('Registro Electrónico')
@Controller('electronic-document-registrations')
export class ElectronicDocumentRegistrationController {
  constructor(
    private readonly registrationService: ElectronicDocumentRegistrationService,
  ) {}

  @Get('search')
  @ApiOperation({ summary: 'Consultar documentos con filtros' })
  search(@Query() filters: SearchDocumentsDto) {
    return this.registrationService.search(filters);
  }

  @Get()
  @ApiOperation({ summary: 'Listar documentos del registro electrónico' })
  findAll(@Query('processingStatus') processingStatus?: DocumentProcessingStatus) {
    return this.registrationService.findAll(processingStatus);
  }

  @Get(':id/line-items')
  @ApiOperation({ summary: 'Obtener líneas del documento para homologación' })
  getLineItems(@Param('id') id: string) {
    return this.registrationService.getLineItems(id);
  }

  @Patch(':documentId/line-items/:lineItemId')
  @ApiOperation({ summary: 'Homologar producto o cuenta de una línea' })
  homologateLineItem(
    @Param('documentId') documentId: string,
    @Param('lineItemId') lineItemId: string,
    @Body() dto: HomologateLineItemDto,
  ) {
    return this.registrationService.homologateLineItem(
      documentId,
      lineItemId,
      dto,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener documento por ID' })
  findOne(@Param('id') id: string) {
    return this.registrationService.findOne(id);
  }

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Subir XML o documento para registro electrónico' })
  upload(@UploadedFile() file: UploadedFilePayload) {
    return this.registrationService.uploadFile(file);
  }

  @Patch(':id/review-status')
  @ApiOperation({ summary: 'Actualizar estado de revisión' })
  updateReviewStatus(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentReviewDto,
  ) {
    return this.registrationService.updateReviewStatus(id, dto);
  }

  @Patch(':id/homologate')
  @ApiOperation({ summary: 'Homologar documento con cuentas y retenciones' })
  homologate(@Param('id') id: string, @Body() dto: HomologateDocumentDto) {
    return this.registrationService.homologate(id, dto);
  }

  @Patch(':id/ready')
  @ApiOperation({ summary: 'Marcar documento listo para procesar' })
  markReady(@Param('id') id: string) {
    return this.registrationService.markReadyToProcess(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar documento del registro' })
  async remove(@Param('id') id: string) {
    await this.registrationService.remove(id);
  }
}
