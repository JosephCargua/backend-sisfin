import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FinancialDocumentService } from '../services/financial-document.service';
import { CreateFinancialDocumentDto } from '../dto/create-financial-document.dto';
import { UploadedFilePayload } from '../../../common/types/uploaded-file.type';

@ApiTags('Documentos')
@Controller('financial-documents')
export class FinancialDocumentController {
  constructor(private readonly documentService: FinancialDocumentService) {}

  @Get()
  @ApiOperation({ summary: 'Listar documentos registrados' })
  findAll() {
    return this.documentService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener documento por ID' })
  findOne(@Param('id') id: string) {
    return this.documentService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar documento' })
  create(@Body() dto: CreateFinancialDocumentDto) {
    return this.documentService.create(dto);
  }

  @Post('parse-xml')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Parsear XML SRI para precargar el formulario' })
  parseXml(@UploadedFile() file: UploadedFilePayload) {
    return this.documentService.parseXmlFile(file);
  }
}
