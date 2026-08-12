import { Injectable } from '@nestjs/common';
import { join } from 'path';
import { existsSync } from 'fs';
const PDFDocument = require('pdfkit');

@Injectable()
export class PdfGeneratorService {
  private async addHeader(doc: any): Promise<void> {
    try {
      const possiblePaths = [
        join(process.cwd(), '..', 'SISFIN', 'src', 'assets', 'logomovimiento.png'),
        join(process.cwd(), 'SISFIN', 'src', 'assets', 'logomovimiento.png'),
        join(__dirname, '..', '..', '..', '..', '..', 'SISFIN', 'src', 'assets', 'logomovimiento.png'),
        'C:\\Users\\johac\\OneDrive\\Desktop\\Carpetas varias\\SISFIN\\SISFIN\\src\\assets\\logomovimiento.png' // Absolute fallback
      ];

      let logoBuffer: Buffer | null = null;
      for (const path of possiblePaths) {
        if (existsSync(path)) {
          try {
            logoBuffer = require('fs').readFileSync(path);
            console.log('Logo loaded from:', path);
            break;
          } catch (e) {
            console.warn('Failed to read logo from:', path, e);
          }
        }
      }

      const logoY = 30;
      const logoHeight = 60;
      const logoWidth = 60;
      
      let textStartX = 50;
      let textWidth = 500;

      if (logoBuffer) {
        try {
          doc.image(logoBuffer, 50, logoY, { width: logoWidth, height: logoHeight });
          textStartX = 120; // Shift text to the right
          textWidth = 430;  // Reduce width available for text
        } catch (e) {
          console.warn('Failed to draw logo on PDF:', e);
        }
      }
      
      // Texto principal
      doc.fontSize(14)
        .font('Helvetica-Bold')
        .text('MOVIMIENTO DE RETIROS PARROQUIALES JUAN XXIII', textStartX, logoY + 15, {
          width: textWidth,
          align: 'center',
        });
      
      // Texto secundario
      doc.fontSize(11)
        .font('Helvetica')
        .text('VICARIATO APOSTÓLICO DE PUYO', textStartX, doc.y + 5, {
          width: textWidth,
          align: 'center',
        });
      
      // Línea naranja
      const lineY = logoY + logoHeight + 10;
      doc.moveTo(50, lineY)
        .lineTo(550, lineY)
        .strokeColor('#FF6600')
        .lineWidth(2)
        .stroke();
      
      doc.y = lineY + 15;
    } catch (error) {
      console.error('Error adding header:', error);
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

  generateBankReconciliation(data: any): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          resolve(Buffer.concat(buffers));
        });
        doc.on('error', (error: Error) => reject(error));

        await this.addHeader(doc);
        
        doc.fontSize(16).font('Helvetica-Bold')
          .text('CONCILIACIÓN BANCARIA', { align: 'center' });
        doc.moveDown(1.5);

        // Cabecera info
        const startX = 50;
        const valX = 180;
        let currentY = doc.y;

        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Fecha de Corte:', startX, currentY);
        doc.font('Helvetica').text(data.reconciliationDate ? new Date(data.reconciliationDate).toLocaleDateString('es-EC') : '', valX, currentY);
        
        currentY += 15;
        doc.font('Helvetica-Bold').text('Banco:', startX, currentY);
        doc.font('Helvetica').text(data.accountName || 'N/A', valX, currentY);

        currentY += 15;
        doc.font('Helvetica-Bold').text('Descripción:', startX, currentY);
        doc.font('Helvetica').text(data.description || 'N/A', valX, currentY, { width: 350 });
        
        const descHeight = doc.heightOfString(data.description || 'N/A', { width: 350 });
        currentY += descHeight > 15 ? descHeight + 5 : 15;

        doc.font('Helvetica-Bold').text('Estado:', startX, currentY);
        doc.font('Helvetica').text(data.status || 'Pendiente', valX, currentY);
        
        doc.y = currentY + 30;

        // --- Cuadro de Resumen Principal ---
        doc.fontSize(11).font('Helvetica-Bold').text('Resumen de Conciliación:', { underline: true });
        doc.moveDown(0.5);

        const drawRowLine = (y: number) => {
          doc.moveTo(50, y).lineTo(590, y).strokeColor('#e2e8f0').lineWidth(1).stroke();
        };

        const drawSummaryLine = (label: string, amount: number, isBold: boolean = false) => {
          const y = doc.y;
          drawRowLine(y);
          doc.y = y + 5;
          if (isBold) doc.font('Helvetica-Bold');
          else doc.font('Helvetica');
          doc.text(label, 50, doc.y);
          doc.text(this.formatCurrency(amount), 450, doc.y, { width: 140, align: 'right' });
          doc.y += 12;
        };

        drawSummaryLine('Saldo Inicial:', Number(data.initialBalance) || 0);
        drawSummaryLine('(+) Ingresos del Sistema:', Number(data.totalIncomes) || 0);
        drawSummaryLine('(-) Egresos del Sistema:', Number(data.totalExpenses) || 0);
        drawSummaryLine('(=) Saldo Contable Conciliado:', Number(data.reconciledBalance) || 0, true);
        doc.moveDown(0.5);
        drawSummaryLine('Saldo Estado de Cuenta:', Number(data.statementBalance) || 0, true);
        drawSummaryLine('Diferencia:', Number(data.difference) || 0, true);
        drawRowLine(doc.y);

        doc.moveDown(2);

        // --- Tabla de transacciones ---
        doc.fontSize(11).font('Helvetica-Bold').text('Detalle de Movimientos Conciliados:', { underline: true });
        doc.moveDown(0.5);

        const colWidths = [60, 240, 100, 100];
        const cols = [50, 110, 350, 450];

        // Header table
        drawRowLine(doc.y);
        doc.font('Helvetica-Bold').fontSize(8);
        let rowY = doc.y + 5;
        doc.text('Fecha', cols[0], rowY, { width: colWidths[0] });
        doc.text('Detalle', cols[1], rowY, { width: colWidths[1] });
        doc.text('Referencia / Tipo', cols[2], rowY, { width: colWidths[2] });
        doc.text('Monto', cols[3], rowY, { width: colWidths[3], align: 'right' });
        doc.y = rowY + 15;
        drawRowLine(doc.y);

        doc.font('Helvetica').fontSize(8);

        if (data.transactions && data.transactions.length > 0) {
          data.transactions.forEach((tx: any) => {
            rowY = doc.y + 5;
            
            if (rowY > 700) {
              doc.addPage();
              drawRowLine(doc.y);
              rowY = doc.y + 5;
            }

            const dateStr = tx.date ? new Date(tx.date).toLocaleDateString('es-EC') : '';
            const detailStr = tx.description || tx.transactionType || '';
            const refStr = tx.reference || tx.checkNumber || tx.paymentMethod || '';
            
            // Format Amount
            const amountNum = Number(tx.amount) || 0;
            const isEgreso = tx.transactionType === 'Egreso' || tx.type === 'Egreso';
            const amountStr = isEgreso ? `(${this.formatCurrency(amountNum)})` : this.formatCurrency(amountNum);

            const heightDet = doc.heightOfString(detailStr, { width: colWidths[1] });
            const heightRow = Math.max(heightDet, 10);

            doc.text(dateStr, cols[0], rowY, { width: colWidths[0] });
            doc.text(detailStr, cols[1], rowY, { width: colWidths[1] });
            doc.text(`${refStr} / ${isEgreso ? 'Egreso' : 'Ingreso'}`, cols[2], rowY, { width: colWidths[2] });
            doc.text(amountStr, cols[3], rowY, { width: colWidths[3], align: 'right' });
            
            doc.y = rowY + heightRow + 5;
            drawRowLine(doc.y);
          });
        } else {
          rowY = doc.y + 5;
          doc.text('No hay movimientos conciliados en este período.', cols[0], rowY, { width: 500, align: 'center' });
          doc.y = rowY + 15;
          drawRowLine(doc.y);
        }

        doc.moveDown(3);
        this.addSignaturesSection(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

