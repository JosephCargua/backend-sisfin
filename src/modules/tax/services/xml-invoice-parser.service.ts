import { Injectable, BadRequestException } from '@nestjs/common';

export interface ParsedLineItem {
  supplierCode: string;
  supplierDescription: string;
  ivaLabel: string;
  quantity: number;
  unitPrice: number;
}

export interface ParsedElectronicDocument {
  issueDate: Date;
  authorizationDate: Date | null;
  documentNumber: string;
  supplierName: string;
  supplierIdentification: string | null;
  documentTypeCode: string;
  documentLabel: string;
  accessKey: string | null;
  total: number | null;
  itemCount: number;
  xmlContent: string;
  lineItems: ParsedLineItem[];
}

@Injectable()
export class XmlInvoiceParserService {
  private readonly docTypeLabels: Record<string, string> = {
    '01': 'FAC',
    '03': 'LC',
    '04': 'NC',
    '05': 'ND',
    '06': 'GR',
    '07': 'RET',
  };

  parse(xmlContent: string): ParsedElectronicDocument {
    const normalized = this.extractInvoiceXml(xmlContent);
    if (!normalized) {
      throw new BadRequestException(
        'No se pudo leer el XML. Verifique que sea un comprobante electrónico válido.',
      );
    }

    const estab = this.getTagValue(normalized, 'estab') || '001';
    const ptoEmi = this.getTagValue(normalized, 'ptoEmi') || '001';
    const secuencial = this.getTagValue(normalized, 'secuencial') || '000000001';
    const codDoc = this.getTagValue(normalized, 'codDoc') || '01';
    const docPrefix = this.docTypeLabels[codDoc] || 'DOC';
    const documentNumber = `${estab}-${ptoEmi}-${secuencial.padStart(9, '0')}`;

    const issueDateStr =
      this.getTagValue(normalized, 'fechaEmision') ||
      this.getTagValue(normalized, 'fechaEmisionDocSustento');
    const issueDate = this.parseDate(issueDateStr);
    if (!issueDate) {
      throw new BadRequestException('No se encontró la fecha de emisión en el XML.');
    }

    const authDateStr =
      this.getTagValue(xmlContent, 'fechaAutorizacion') ||
      this.getTagValue(normalized, 'fechaAutorizacion');
    const authorizationDate = authDateStr ? this.parseDate(authDateStr) : null;

    const supplierName =
      this.getTagValue(normalized, 'razonSocial') ||
      this.getTagValue(normalized, 'nombreComercial') ||
      this.getTagValue(normalized, 'razonSocialSujetoRetenido') ||
      'Proveedor sin nombre';

    const supplierIdentification =
      this.getTagValue(normalized, 'ruc') ||
      this.getTagValue(normalized, 'identificacionSujetoRetenido') ||
      null;

    const accessKey = this.getTagValue(normalized, 'claveAcceso');
    const totalStr =
      this.getTagValue(normalized, 'importeTotal') ||
      this.getTagValue(normalized, 'valorTotal');
    const total = totalStr ? parseFloat(totalStr) : null;
    const lineItems = this.parseLineItems(normalized);
    const itemCount = lineItems.length;

    return {
      issueDate,
      authorizationDate,
      documentNumber,
      supplierName,
      supplierIdentification,
      documentTypeCode: codDoc,
      documentLabel: `${docPrefix} ${documentNumber}`,
      accessKey,
      total,
      itemCount,
      xmlContent: normalized,
      lineItems,
    };
  }

  parseLineItems(xml: string): ParsedLineItem[] {
    const blocks = xml.match(/<detalle>[\s\S]*?<\/detalle>/gi) || [];
    return blocks.map((block, index) => {
      const supplierCode =
        this.getTagValue(block, 'codigoPrincipal') ||
        this.getTagValue(block, 'codigoAuxiliar') ||
        String(index + 1);
      const supplierDescription =
        this.getTagValue(block, 'descripcion') || 'Sin descripción';
      const quantity = parseFloat(this.getTagValue(block, 'cantidad') || '1');
      const unitPrice = parseFloat(
        this.getTagValue(block, 'precioUnitario') || '0',
      );
      const ivaLabel = this.extractIvaLabel(block);

      return {
        supplierCode,
        supplierDescription,
        ivaLabel,
        quantity: isNaN(quantity) ? 1 : quantity,
        unitPrice: isNaN(unitPrice) ? 0 : unitPrice,
      };
    });
  }

  private extractIvaLabel(detalleXml: string): string {
    const tarifa = this.getTagValue(detalleXml, 'tarifa');
    if (tarifa) return `${tarifa}%`;
    const codigoPorcentaje = this.getTagValue(detalleXml, 'codigoPorcentaje');
    const ivaRates: Record<string, string> = {
      '0': '0%',
      '2': '12%',
      '3': '14%',
      '4': '15%',
      '5': '5%',
      '6': 'no objeto',
      '7': 'exento',
      '8': '0%',
      '10': '13%',
    };
    if (codigoPorcentaje && ivaRates[codigoPorcentaje]) {
      return ivaRates[codigoPorcentaje];
    }
    return '0%';
  }

  private extractInvoiceXml(content: string): string | null {
    const trimmed = content.trim();
    if (trimmed.includes('<factura')) {
      return trimmed;
    }
    if (trimmed.includes('<comprobanteRetencion')) {
      return trimmed;
    }
    if (trimmed.includes('<notaCredito')) {
      return trimmed;
    }
    if (trimmed.includes('<notaDebito')) {
      return trimmed;
    }

    const cdataMatch = trimmed.match(
      /<comprobante[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/comprobante>/i,
    );
    if (cdataMatch?.[1]) {
      return cdataMatch[1].trim();
    }

    const innerMatch = trimmed.match(/<comprobante[^>]*>([\s\S]*?)<\/comprobante>/i);
    if (innerMatch?.[1] && innerMatch[1].includes('<')) {
      return innerMatch[1].trim();
    }

    return null;
  }

  private getTagValue(xml: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i');
    const match = xml.match(regex);
    return match?.[1]?.trim() || null;
  }

  private parseDate(value: string | null): Date | null {
    if (!value) return null;
    const cleaned = value.split(' ')[0].trim();
    const slashParts = cleaned.split('/');
    if (slashParts.length === 3) {
      const [day, month, year] = slashParts.map((p) => parseInt(p, 10));
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month - 1, day);
      }
    }
    const iso = new Date(cleaned);
    return isNaN(iso.getTime()) ? null : iso;
  }
}
