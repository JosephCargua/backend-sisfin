import { Injectable } from '@nestjs/common';
import { join } from 'path';
import { existsSync } from 'fs';
const PDFDocument = require('pdfkit');

@Injectable()
export class PdfGeneratorService {
  private async addHeader(doc: any): Promise<void> {
    try {
      // Intentar múltiples rutas posibles para el logo
      const possiblePaths = [
        join(process.cwd(), '..', 'SISFIN', 'src', 'assets', 'logomovimiento.png'),
        join(process.cwd(), 'SISFIN', 'src', 'assets', 'logomovimiento.png'),
        join(__dirname, '..', '..', '..', '..', '..', 'SISFIN', 'src', 'assets', 'logomovimiento.png'),
      ];

      let logoPath: string | null = null;
      for (const path of possiblePaths) {
        if (existsSync(path)) {
          logoPath = path;
          console.log('Logo found at:', logoPath);
          break;
        }
      }

      const logoY = 30;
      const logoHeight = 60;
      
      if (logoPath) {
        doc.image(logoPath, 50, logoY, { width: 60, height: logoHeight });
        console.log('Logo added to PDF');
      } else {
        console.warn('Logo not found in any of the expected paths:', possiblePaths);
      }
      
      // Texto principal más pequeño y ajustado
      doc.fontSize(13)
        .font('Helvetica-Bold')
        .text('MOVIMIENTO DE RETIROS PARROQUIALES JUAN XXIII', 120, logoY + 5, {
          width: 400,
          align: 'left',
        });
      
      // Texto secundario centrado
      doc.fontSize(11)
        .font('Helvetica')
        .text('VICARIATO APOSTÓLICO DE PUYO', 50, logoY + 30, {
          width: 500,
          align: 'center',
        });
      
      // Línea naranja más abajo, después del logo y textos
      const lineY = logoY + logoHeight + 10;
      doc.moveTo(50, lineY)
        .lineTo(550, lineY)
        .strokeColor('#FF6600')
        .lineWidth(2)
        .stroke();
      
      // Asegurar que el siguiente contenido esté después del encabezado
      doc.y = lineY + 15;
      console.log('Header added successfully, current Y position:', doc.y);
    } catch (error) {
      console.error('Error adding header:', error);
      // Continuar sin el encabezado si hay error
    }
  }

  generateBalanceSheet(data: any): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        if (!data) {
          throw new Error('Data is required to generate balance sheet');
        }

        const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });

        doc.on('error', (error: Error) => {
          reject(error);
        });

        await this.addHeader(doc);
        
        doc.fontSize(20)
          .font('Helvetica-Bold')
          .text('BALANCE GENERAL', { align: 'center' });
        doc.moveDown();

        const dateStr = data.date 
          ? new Date(data.date).toLocaleDateString('es-EC') 
          : 'N/A';
        doc.fontSize(12).text(`Fecha: ${dateStr}`, {
          align: 'right',
        });
        doc.moveDown(2);

        doc.fontSize(14).text('ACTIVOS', { underline: true });
        doc.moveDown();

        if (data.assets && Array.isArray(data.assets) && data.assets.length > 0) {
          data.assets.forEach((asset: any) => {
            doc.fontSize(10);
            doc.text(asset.accountName || asset.code || 'N/A', { continued: true });
            doc.text(
              this.formatCurrency(asset.balance || 0),
              { align: 'right', continued: false },
            );
            doc.moveDown(0.5);
          });
        }

        doc.moveDown();
        doc.fontSize(12).text(
          `TOTAL ACTIVOS: ${this.formatCurrency(data.totalAssets || 0)}`,
          { align: 'right', underline: true },
        );

        doc.moveDown(2);

        doc.fontSize(14).text('PASIVOS', { underline: true });
        doc.moveDown();

        if (data.liabilities && Array.isArray(data.liabilities) && data.liabilities.length > 0) {
          data.liabilities.forEach((liability: any) => {
            doc.fontSize(10);
            doc.text(liability.accountName || liability.code || 'N/A', { continued: true });
            doc.text(
              this.formatCurrency(liability.balance || 0),
              { align: 'right', continued: false },
            );
            doc.moveDown(0.5);
          });
        }

        doc.moveDown();
        doc.fontSize(12).text(
          `TOTAL PASIVOS: ${this.formatCurrency(data.totalLiabilities || 0)}`,
          { align: 'right', underline: true },
        );

        doc.moveDown(2);

        doc.fontSize(14).text('PATRIMONIO', { underline: true });
        doc.moveDown();

        if (data.equity && Array.isArray(data.equity) && data.equity.length > 0) {
          data.equity.forEach((eq: any) => {
            doc.fontSize(10);
            doc.text(eq.accountName || eq.code || 'N/A', { continued: true });
            doc.text(
              this.formatCurrency(eq.balance || 0),
              { align: 'right', continued: false },
            );
            doc.moveDown(0.5);
          });
        }

        doc.moveDown();
        doc.fontSize(12).text(
          `TOTAL PATRIMONIO: ${this.formatCurrency(data.totalEquity || 0)}`,
          { align: 'right', underline: true },
        );

        doc.moveDown(2);
        doc.fontSize(14).text(
          `TOTAL PASIVOS + PATRIMONIO: ${this.formatCurrency(
            (data.totalLiabilities || 0) + (data.totalEquity || 0),
          )}`,
          { align: 'right', underline: true },
        );

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  generateIncomeStatement(data: any): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });

        doc.on('error', (error: Error) => {
          reject(error);
        });

        await this.addHeader(doc);
        
        doc.fontSize(20)
          .font('Helvetica-Bold')
          .text('ESTADO DE RESULTADOS', { align: 'center' });
        doc.moveDown();

        doc.fontSize(12).text(
          `Período: ${new Date(data.startDate).toLocaleDateString('es-EC')} - ${new Date(data.endDate).toLocaleDateString('es-EC')}`,
          { align: 'right' },
        );
        doc.moveDown(2);

        doc.fontSize(14).text('INGRESOS', { underline: true });
        doc.moveDown();

        if (data.income && data.income.length > 0) {
          data.income.forEach((inc: any) => {
            doc.fontSize(10);
            doc.text(inc.accountName || inc.code, { continued: true });
            doc.text(
              this.formatCurrency(inc.balance),
              { align: 'right', continued: false },
            );
            doc.moveDown(0.5);
          });
        }

        doc.moveDown();
        doc.fontSize(12).text(
          `TOTAL INGRESOS: ${this.formatCurrency(data.totalIncome || 0)}`,
          { align: 'right', underline: true },
        );

        doc.moveDown(2);

        doc.fontSize(14).text('GASTOS', { underline: true });
        doc.moveDown();

        if (data.expenses && data.expenses.length > 0) {
          data.expenses.forEach((exp: any) => {
            doc.fontSize(10);
            doc.text(exp.accountName || exp.code, { continued: true });
            doc.text(
              this.formatCurrency(exp.balance),
              { align: 'right', continued: false },
            );
            doc.moveDown(0.5);
          });
        }

        doc.moveDown();
        doc.fontSize(12).text(
          `TOTAL GASTOS: ${this.formatCurrency(data.totalExpenses || 0)}`,
          { align: 'right', underline: true },
        );

        doc.moveDown(2);
        const netIncome = (data.totalIncome || 0) - (data.totalExpenses || 0);
        doc.fontSize(16).text(
          `UTILIDAD NETA: ${this.formatCurrency(netIncome)}`,
          { align: 'right', underline: true },
        );

        this.addSignaturesSection(doc, data.signatures);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  generateGeneralLedger(data: any): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });

        doc.on('error', (error: Error) => {
          reject(error);
        });

        await this.addHeader(doc);
        
        doc.fontSize(20)
          .font('Helvetica-Bold')
          .text('LIBRO MAYOR', { align: 'center' });
        doc.moveDown();

        doc.fontSize(12).text(
          `Cuenta: ${data.account?.name || data.account?.code || 'N/A'}`,
        );
        doc.text(
          `Período: ${new Date(data.startDate).toLocaleDateString('es-EC')} - ${new Date(data.endDate).toLocaleDateString('es-EC')}`,
        );
        doc.moveDown(2);

        doc.fontSize(10);
        doc.text('Fecha', 50, doc.y, { width: 80 });
        doc.text('Número', 130, doc.y, { width: 100 });
        doc.text('Descripción', 230, doc.y, { width: 150 });
        doc.text('Débito', 380, doc.y, { width: 80, align: 'right' });
        doc.text('Crédito', 460, doc.y, { width: 80, align: 'right' });
        doc.text('Saldo', 540, doc.y, { width: 80, align: 'right' });
        doc.moveDown();

        if (data.movements && data.movements.length > 0) {
          data.movements.forEach((movement: any) => {
            const entry = movement.journalEntry || {};
            doc.text(
              new Date(entry.date || '').toLocaleDateString('es-EC'),
              50,
              doc.y,
              { width: 80 },
            );
            doc.text(entry.entryNumber || '', 130, doc.y, { width: 100 });
            doc.text(movement.description || '', 230, doc.y, { width: 150 });
            doc.text(
              this.formatCurrency(movement.debit || 0),
              380,
              doc.y,
              { width: 80, align: 'right' },
            );
            doc.text(
              this.formatCurrency(movement.credit || 0),
              460,
              doc.y,
              { width: 80, align: 'right' },
            );
            doc.text(
              this.formatCurrency(movement.balance || 0),
              540,
              doc.y,
              { width: 80, align: 'right' },
            );
            doc.moveDown(0.5);
          });
        }

        doc.moveDown();
        doc.fontSize(12).text(
          `SALDO FINAL: ${this.formatCurrency(data.finalBalance || 0)}`,
          { align: 'right', underline: true },
        );

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private addSignaturesSection(doc: any, customSignatures?: any): void {
    doc.moveDown(3);
    
    const startY = doc.y;
    const lineLength = 180;
    const lineYOffset = 25;
    const textYOffset = 5;
    const rowSpacing = 90;
    
    doc.fontSize(9).font('Helvetica');
    
    let row1Signatures: any[] = [];
    let row2Signatures: any[] = [];
    
    if (customSignatures && customSignatures.row1 && customSignatures.row2) {
      row1Signatures = [
        {
          x: 50,
          ...customSignatures.row1[0],
        },
        {
          x: 320,
          ...customSignatures.row1[1],
        },
      ];
      
      row2Signatures = [
        {
          x: 50,
          ...customSignatures.row2[0],
        },
        {
          x: 250,
          ...customSignatures.row2[1],
        },
        {
          x: 450,
          ...customSignatures.row2[2],
        },
      ];
    } else {
      row1Signatures = [
        {
          x: 50,
          name: 'Hno. Miguel Angel Cargua',
          role: 'PRESIDENTE',
          org: 'MOVIMIENTO JUAN XXIII',
          location: 'VICARIATO DE PUYO',
        },
        {
          x: 320,
          name: 'Ing. Daniela Reyes D.',
          role: 'CONTADORA',
          org: 'MOVIMIENTO JUAN XXIII',
          location2: 'VICARIATO DE PUYO',
        },
      ];
      
      row2Signatures = [
        {
          x: 50,
          name: 'Hermana Leonor Torres',
          role: 'ECONOMA',
          org: 'MOVIMIENTO JUAN XXIII',
          location: 'VICARIATO DE PUYO',
        },
        {
          x: 250,
          name: 'Padre. Jose Castillo',
          role: 'GUIA ESPIRITUAL DEL MOVIMIENTO JUAN XXIII- VAP',
        },
        {
          x: 450,
          name: 'Mons. Rafael Cob Garcia',
          role: 'OBISPO DEL VAP',
        },
      ];
    }
    
    const drawSignature = (sig: any, baseY: number) => {
      const lineY = baseY + lineYOffset;
      const textY = lineY + textYOffset;
      
      doc.moveTo(sig.x, lineY)
        .lineTo(sig.x + lineLength, lineY)
        .strokeColor('#000000')
        .lineWidth(0.5)
        .stroke();
      
      let currentTextY = textY;
      
      doc.fontSize(8)
        .font('Helvetica')
        .text(sig.name, sig.x, currentTextY, {
          width: lineLength,
          align: 'center',
        });
      
      currentTextY += 10;
      
      doc.fontSize(7)
        .font('Helvetica-Bold')
        .text(sig.role, sig.x, currentTextY, {
          width: lineLength,
          align: 'center',
        });
      
      if (sig.org) {
        currentTextY += 9;
        doc.fontSize(7)
          .font('Helvetica')
          .text(sig.org, sig.x, currentTextY, {
            width: lineLength,
            align: 'center',
          });
      }
      
      if (sig.location) {
        currentTextY += 8;
        doc.fontSize(7)
          .font('Helvetica')
          .text(sig.location, sig.x, currentTextY, {
            width: lineLength,
            align: 'center',
          });
      }
      
      if (sig.org2) {
        currentTextY += 8;
        doc.fontSize(7)
          .font('Helvetica')
          .text(sig.org2, sig.x, currentTextY, {
            width: lineLength,
            align: 'center',
          });
      }
      
      if (sig.location2) {
        currentTextY += 8;
        doc.fontSize(7)
          .font('Helvetica')
          .text(sig.location2, sig.x, currentTextY, {
            width: lineLength,
            align: 'center',
          });
      }
    };
    
    row1Signatures.forEach((sig) => {
      drawSignature(sig, startY);
    });
    
    const row2Y = startY + rowSpacing;
    row2Signatures.forEach((sig) => {
      drawSignature(sig, row2Y);
    });
    
    doc.y = row2Y + rowSpacing;
  }

  private formatCurrency(amount: number | null | undefined): string {
    const numAmount = amount || 0;
    if (typeof numAmount !== 'number' || isNaN(numAmount)) {
      return '$0.00';
    }
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(numAmount);
  }
}

