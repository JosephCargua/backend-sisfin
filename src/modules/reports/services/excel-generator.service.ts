import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';

@Injectable()
export class ExcelGeneratorService {
  async generateBalanceSheet(data: any): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Balance General');

    worksheet.columns = [
      { header: 'Cuenta', key: 'account', width: 40 },
      { header: 'Saldo', key: 'balance', width: 20 },
    ];

    worksheet.getRow(1).font = { bold: true, size: 14 };
    worksheet.mergeCells('A1:B1');
    worksheet.getCell('A1').value = 'BALANCE GENERAL';
    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 25;

    worksheet.mergeCells('A2:B2');
    worksheet.getCell('A2').value = `Fecha: ${new Date(data.date).toLocaleDateString('es-EC')}`;
    worksheet.getCell('A2').alignment = { horizontal: 'right' };

    let currentRow = 4;

    worksheet.getCell(`A${currentRow}`).value = 'ACTIVOS';
    worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 12 };
    worksheet.getCell(`A${currentRow}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
    currentRow++;

    if (data.assets && data.assets.length > 0) {
      data.assets.forEach((asset: any) => {
        worksheet.addRow({
          account: asset.accountName || asset.code,
          balance: asset.balance || 0,
        });
        currentRow++;
      });
    }

    worksheet.getCell(`A${currentRow}`).value = 'TOTAL ACTIVOS';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    worksheet.getCell(`B${currentRow}`).value = data.totalAssets || 0;
    worksheet.getCell(`B${currentRow}`).numFmt = '$#,##0.00';
    worksheet.getCell(`B${currentRow}`).font = { bold: true };
    currentRow += 2;

    worksheet.getCell(`A${currentRow}`).value = 'PASIVOS';
    worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 12 };
    worksheet.getCell(`A${currentRow}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
    currentRow++;

    if (data.liabilities && data.liabilities.length > 0) {
      data.liabilities.forEach((liability: any) => {
        worksheet.addRow({
          account: liability.accountName || liability.code,
          balance: liability.balance || 0,
        });
        currentRow++;
      });
    }

    worksheet.getCell(`A${currentRow}`).value = 'TOTAL PASIVOS';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    worksheet.getCell(`B${currentRow}`).value = data.totalLiabilities || 0;
    worksheet.getCell(`B${currentRow}`).numFmt = '$#,##0.00';
    worksheet.getCell(`B${currentRow}`).font = { bold: true };
    currentRow += 2;

    worksheet.getCell(`A${currentRow}`).value = 'PATRIMONIO';
    worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 12 };
    worksheet.getCell(`A${currentRow}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
    currentRow++;

    if (data.equity && data.equity.length > 0) {
      data.equity.forEach((eq: any) => {
        worksheet.addRow({
          account: eq.accountName || eq.code,
          balance: eq.balance || 0,
        });
        currentRow++;
      });
    }

    worksheet.getCell(`A${currentRow}`).value = 'TOTAL PATRIMONIO';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    worksheet.getCell(`B${currentRow}`).value = data.totalEquity || 0;
    worksheet.getCell(`B${currentRow}`).numFmt = '$#,##0.00';
    worksheet.getCell(`B${currentRow}`).font = { bold: true };

    worksheet.getColumn(2).numFmt = '$#,##0.00';
    worksheet.getColumn(2).alignment = { horizontal: 'right' };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async generateIncomeStatement(data: any): Promise<Buffer> {
    try {
      if (!data) {
        throw new Error('Data is required to generate income statement');
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Estado de Resultados');

      worksheet.columns = [
        { header: 'Cuenta', key: 'account', width: 40 },
        { header: 'Saldo', key: 'balance', width: 20 },
      ];

      worksheet.getRow(1).font = { bold: true, size: 14 };
      worksheet.mergeCells('A1:B1');
      worksheet.getCell('A1').value = 'ESTADO DE RESULTADOS';
      worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(1).height = 25;

      worksheet.mergeCells('A2:B2');
      const startDateStr = data.startDate 
        ? new Date(data.startDate).toLocaleDateString('es-EC') 
        : 'N/A';
      const endDateStr = data.endDate 
        ? new Date(data.endDate).toLocaleDateString('es-EC') 
        : 'N/A';
      worksheet.getCell('A2').value = `Período: ${startDateStr} - ${endDateStr}`;
      worksheet.getCell('A2').alignment = { horizontal: 'right' };

    let currentRow = 4;

    worksheet.getCell(`A${currentRow}`).value = 'INGRESOS';
    worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 12 };
    worksheet.getCell(`A${currentRow}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
    currentRow++;

    if (data.income && Array.isArray(data.income) && data.income.length > 0) {
      data.income.forEach((inc: any) => {
        worksheet.addRow({
          account: inc.accountName || inc.code || 'N/A',
          balance: inc.balance || 0,
        });
        currentRow++;
      });
    }

    worksheet.getCell(`A${currentRow}`).value = 'TOTAL INGRESOS';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    worksheet.getCell(`B${currentRow}`).value = data.totalIncome || 0;
    worksheet.getCell(`B${currentRow}`).numFmt = '$#,##0.00';
    worksheet.getCell(`B${currentRow}`).font = { bold: true };
    currentRow += 2;

    worksheet.getCell(`A${currentRow}`).value = 'GASTOS';
    worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 12 };
    worksheet.getCell(`A${currentRow}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
    currentRow++;

    if (data.expenses && Array.isArray(data.expenses) && data.expenses.length > 0) {
      data.expenses.forEach((exp: any) => {
        worksheet.addRow({
          account: exp.accountName || exp.code || 'N/A',
          balance: exp.balance || 0,
        });
        currentRow++;
      });
    }

    worksheet.getCell(`A${currentRow}`).value = 'TOTAL GASTOS';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    worksheet.getCell(`B${currentRow}`).value = data.totalExpenses || 0;
    worksheet.getCell(`B${currentRow}`).numFmt = '$#,##0.00';
    worksheet.getCell(`B${currentRow}`).font = { bold: true };
    currentRow += 2;

    const netIncome = (data.totalIncome || 0) - (data.totalExpenses || 0);
    worksheet.getCell(`A${currentRow}`).value = 'UTILIDAD NETA';
    worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 12 };
    worksheet.getCell(`B${currentRow}`).value = netIncome;
    worksheet.getCell(`B${currentRow}`).numFmt = '$#,##0.00';
    worksheet.getCell(`B${currentRow}`).font = { bold: true, size: 12 };

      worksheet.getColumn(2).numFmt = '$#,##0.00';
      worksheet.getColumn(2).alignment = { horizontal: 'right' };

      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer);
    } catch (error) {
      console.error('Error in generateIncomeStatement Excel:', error);
      throw error;
    }
  }

  async generateGeneralLedger(data: any): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Libro Mayor');

    worksheet.columns = [
      { header: 'Fecha', key: 'date', width: 15 },
      { header: 'Número', key: 'entryNumber', width: 20 },
      { header: 'Descripción', key: 'description', width: 40 },
      { header: 'Débito', key: 'debit', width: 15 },
      { header: 'Crédito', key: 'credit', width: 15 },
      { header: 'Saldo', key: 'balance', width: 15 },
    ];

    worksheet.getRow(1).font = { bold: true, size: 14 };
    worksheet.mergeCells('A1:F1');
    worksheet.getCell('A1').value = 'LIBRO MAYOR';
    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 25;

    worksheet.mergeCells('A2:F2');
    worksheet.getCell('A2').value = `Cuenta: ${data.account?.name || data.account?.code || 'N/A'}`;
    worksheet.mergeCells('A3:F3');
    worksheet.getCell('A3').value = `Período: ${new Date(data.startDate).toLocaleDateString('es-EC')} - ${new Date(data.endDate).toLocaleDateString('es-EC')}`;

    worksheet.getRow(5).font = { bold: true };
    worksheet.getRow(5).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    if (data.movements && data.movements.length > 0) {
      data.movements.forEach((movement: any) => {
        const entry = movement.journalEntry || {};
        worksheet.addRow({
          date: new Date(entry.date || '').toLocaleDateString('es-EC'),
          entryNumber: entry.entryNumber || '',
          description: movement.description || '',
          debit: movement.debit || 0,
          credit: movement.credit || 0,
          balance: movement.balance || 0,
        });
      });
    }

    const lastRow = worksheet.rowCount + 1;
    worksheet.getCell(`D${lastRow}`).value = 'SALDO FINAL';
    worksheet.getCell(`D${lastRow}`).font = { bold: true };
    worksheet.getCell(`F${lastRow}`).value = data.finalBalance || 0;
    worksheet.getCell(`F${lastRow}`).numFmt = '$#,##0.00';
    worksheet.getCell(`F${lastRow}`).font = { bold: true };

    // Ajustar formato de columnas numéricas
    const numColumns = ['D', 'E', 'F'];
    numColumns.forEach((col) => {
      for (let row = 2; row <= lastRow; row++) {
        const cell = worksheet.getCell(`${col}${row}`);
        if (cell.value !== null && typeof cell.value === 'number') {
          cell.numFmt = '$#,##0.00';
          cell.alignment = { horizontal: 'right' };
        }
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

