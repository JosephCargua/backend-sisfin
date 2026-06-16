import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RetentionService } from '../services/retention.service';
import { CreateRetentionDto } from '../dto/create-retention.dto';

@ApiTags('Retenciones')
@Controller('retentions')
export class RetentionController {
  constructor(private readonly retentionService: RetentionService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear comprobante de retención' })
  create(@Body() createRetentionDto: CreateRetentionDto) {
    return this.retentionService.create(createRetentionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las retenciones' })
  findAll() {
    return this.retentionService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener retención por ID' })
  findOne(@Param('id') id: string) {
    return this.retentionService.findOne(id);
  }

  @Patch(':id/sign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Firmar comprobante de retención' })
  signRetention(@Param('id') id: string) {
    return this.retentionService.signRetention(id);
  }

  @Patch(':id/authorize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autorizar comprobante de retención' })
  authorizeRetention(
    @Param('id') id: string,
    @Body('authorizationNumber') authorizationNumber: string,
  ) {
    return this.retentionService.authorizeRetention(id, authorizationNumber);
  }
}

