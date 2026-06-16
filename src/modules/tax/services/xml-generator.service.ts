import { Injectable } from '@nestjs/common';
import { ElectronicInvoice } from '../entities/electronic-invoice.entity';
import { Retention } from '../entities/retention.entity';
import { ATS } from '../entities/ats.entity';

@Injectable()
export class XmlGeneratorService {
  generateInvoiceXML(invoice: ElectronicInvoice, version: string = '2.0.0'): string {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<factura id="comprobante" version="${version}">
  <infoTributaria>
    <ambiente>${invoice.environment || '2'}</ambiente>
    <tipoEmision>1</tipoEmision>
    <razonSocial>EMPRESA DEMO</razonSocial>
    <nombreComercial>EMPRESA DEMO</nombreComercial>
    <ruc>0999999999001</ruc>
    <claveAcceso>${invoice.accessKey}</claveAcceso>
    <codDoc>01</codDoc>
    <estab>001</estab>
    <ptoEmi>001</ptoEmi>
    <secuencial>${invoice.invoiceNumber.split('-')[2] || '000000001'}</secuencial>
    <dirMatriz>AV. PRINCIPAL 123</dirMatriz>
  </infoTributaria>
  <infoFactura>
    <fechaEmision>${this.formatDate(invoice.issueDate)}</fechaEmision>
    <dirEstablecimiento>AV. PRINCIPAL 123</dirEstablecimiento>
    <obligadoContabilidad>SI</obligadoContabilidad>
    <tipoIdentificacionComprador>04</tipoIdentificacionComprador>
    <razonSocialComprador>${this.escapeXml(invoice.customerName)}</razonSocialComprador>
    <identificacionComprador>${invoice.customerIdentification}</identificacionComprador>
    <totalSinImpuestos>${invoice.subtotal.toFixed(2)}</totalSinImpuestos>
    <totalDescuento>0.00</totalDescuento>
    <totalImpuesto>
      <codigo>2</codigo>
      <codigoPorcentaje>2</codigoPorcentaje>
      <baseImponible>${invoice.subtotal.toFixed(2)}</baseImponible>
      <valor>${invoice.taxAmount.toFixed(2)}</valor>
    </totalImpuesto>
    <importeTotal>${invoice.total.toFixed(2)}</importeTotal>
  </infoFactura>
  <detalles>
    <detalle>
      <codigoPrincipal>001</codigoPrincipal>
      <descripcion>Producto o Servicio</descripcion>
      <cantidad>1</cantidad>
      <precioUnitario>${invoice.subtotal.toFixed(2)}</precioUnitario>
      <descuento>0.00</descuento>
      <precioTotalSinImpuesto>${invoice.subtotal.toFixed(2)}</precioTotalSinImpuesto>
      <impuestos>
        <impuesto>
          <codigo>2</codigo>
          <codigoPorcentaje>2</codigoPorcentaje>
          <tarifa>15.00</tarifa>
          <baseImponible>${invoice.subtotal.toFixed(2)}</baseImponible>
          <valor>${invoice.taxAmount.toFixed(2)}</valor>
        </impuesto>
      </impuestos>
    </detalle>
  </detalles>
</factura>`;

    return xml;
  }

  generateRetentionXML(retention: Retention, version: string = '1.0.0'): string {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<comprobanteRetencion id="comprobante" version="${version}">
  <infoTributaria>
    <ambiente>${retention.environment || '2'}</ambiente>
    <tipoEmision>1</tipoEmision>
    <razonSocial>EMPRESA DEMO</razonSocial>
    <nombreComercial>EMPRESA DEMO</nombreComercial>
    <ruc>0999999999001</ruc>
    <claveAcceso>${retention.accessKey}</claveAcceso>
    <codDoc>07</codDoc>
    <estab>001</estab>
    <ptoEmi>001</ptoEmi>
    <secuencial>${retention.documentNumber.split('-')[2] || '000000001'}</secuencial>
    <dirMatriz>AV. PRINCIPAL 123</dirMatriz>
  </infoTributaria>
  <infoCompRetencion>
    <fechaEmision>${this.formatDate(retention.issueDate)}</fechaEmision>
    <dirEstablecimiento>AV. PRINCIPAL 123</dirEstablecimiento>
    <obligadoContabilidad>SI</obligadoContabilidad>
    <tipoIdentificacionSujetoRetenido>04</tipoIdentificacionSujetoRetenido>
    <razonSocialSujetoRetenido>${this.escapeXml(retention.supplierName)}</razonSocialSujetoRetenido>
    <identificacionSujetoRetenido>${retention.supplierIdentification}</identificacionSujetoRetenido>
    <periodoFiscal>${new Date(retention.issueDate).getFullYear()}-${String(new Date(retention.issueDate).getMonth() + 1).padStart(2, '0')}</periodoFiscal>
  </infoCompRetencion>
  <impuestos>
    <impuesto>
      <codigo>${retention.retentionCode}</codigo>
      <codigoRetencion>${retention.retentionCode}</codigoRetencion>
      <baseImponible>${retention.baseAmount.toFixed(2)}</baseImponible>
      <porcentajeRetener>${retention.retentionRate.toFixed(2)}</porcentajeRetener>
      <valorRetenido>${retention.retentionAmount.toFixed(2)}</valorRetenido>
      <codDocSustento>01</codDocSustento>
      <numDocSustento>001-001-000000001</numDocSustento>
      <fechaEmisionDocSustento>${this.formatDate(retention.issueDate)}</fechaEmisionDocSustento>
    </impuesto>
  </impuestos>
</comprobanteRetencion>`;

    return xml;
  }

  generateATSXML(ats: ATS, invoices: ElectronicInvoice[], retentions: Retention[]): string {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ATS version="1.0.0">
  <informacionGeneral>
    <anio>${ats.year}</anio>
    <mes>${String(ats.month).padStart(2, '0')}</mes>
    <numEstabRuc>001</numEstabRuc>
    <totalVentas>${ats.totalAmount.toFixed(2)}</totalVentas>
    <codigoOperativo>DIMM</codigoOperativo>
  </informacionGeneral>
  <ventas>
    ${invoices.map((inv) => this.generateATSInvoiceLine(inv)).join('\n    ')}
  </ventas>
  <compras>
    ${retentions.map((ret) => this.generateATSRetentionLine(ret)).join('\n    ')}
  </compras>
</ATS>`;

    return xml;
  }

  private generateATSInvoiceLine(invoice: ElectronicInvoice): string {
    return `<venta>
      <codEstab>001</codEstab>
      <fechaEmision>${this.formatDate(invoice.issueDate)}</fechaEmision>
      <numeroComprobante>${invoice.invoiceNumber}</numeroComprobante>
      <tipoComprobante>01</tipoComprobante>
      <identificacionComprador>${invoice.customerIdentification}</identificacionComprador>
      <razonSocialComprador>${this.escapeXml(invoice.customerName)}</razonSocialComprador>
      <baseImponible>${invoice.subtotal.toFixed(2)}</baseImponible>
      <impuesto>${invoice.taxAmount.toFixed(2)}</impuesto>
      <total>${invoice.total.toFixed(2)}</total>
    </venta>`;
  }

  private generateATSRetentionLine(retention: Retention): string {
    return `<compra>
      <codEstab>001</codEstab>
      <fechaEmision>${this.formatDate(retention.issueDate)}</fechaEmision>
      <numeroComprobante>${retention.documentNumber}</numeroComprobante>
      <tipoComprobante>07</tipoComprobante>
      <identificacionProveedor>${retention.supplierIdentification}</identificacionProveedor>
      <razonSocialProveedor>${this.escapeXml(retention.supplierName)}</razonSocialProveedor>
      <baseImponible>${retention.baseAmount.toFixed(2)}</baseImponible>
      <impuesto>${retention.retentionAmount.toFixed(2)}</impuesto>
    </compra>`;
  }

  private formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${day}/${month}/${year}`;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

