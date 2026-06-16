import { Injectable } from '@nestjs/common';

@Injectable()
export class AccessKeyGeneratorService {
  generateAccessKey(
    date: Date,
    documentType: string,
    establishment: string,
    pointOfEmission: string,
    sequential: string,
    environment: string = '2',
    checkDigit?: string,
  ): string {
    const ruc = '0999999999001';
    const dateStr = this.formatDateForAccessKey(date);
    const docType = documentType.padStart(2, '0');
    const estab = establishment.padStart(3, '0');
    const ptoEmi = pointOfEmission.padStart(3, '0');
    const seq = sequential.padStart(9, '0');
    const env = environment;

    const baseKey = `${dateStr}${docType}${ruc}${env}${estab}${ptoEmi}${seq}`;

    if (!checkDigit) {
      checkDigit = this.calculateCheckDigit(baseKey);
    }

    return `${baseKey}${checkDigit}`;
  }

  private formatDateForAccessKey(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${day}${month}${year}`;
  }

  private calculateCheckDigit(baseKey: string): string {
    const multipliers = [2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1];

    let sum = 0;
    for (let i = 0; i < baseKey.length; i++) {
      const digit = parseInt(baseKey[i], 10);
      const product = digit * multipliers[i];
      sum += product > 9 ? product - 9 : product;
    }

    const remainder = sum % 10;
    const checkDigit = remainder === 0 ? 0 : 10 - remainder;

    return String(checkDigit);
  }
}

