import { Injectable } from '@nestjs/common';

@Injectable()
export class TaxCalculationService {
  calculateIVA(amount: number, rate: number): number {
    return amount * (rate / 100);
  }

  calculateSubtotalWithIVA(total: number, rate: number): number {
    return total / (1 + rate / 100);
  }

  getIVARates(): { code: string; rate: number; description: string }[] {
    return [
      { code: '0', rate: 0, description: '0% - Exento' },
      { code: '2', rate: 15, description: '15% - IVA General' },
      { code: '3', rate: 0, description: '0% - Bienes y Servicios' },
    ];
  }

  getRetentionCodes(): { code: string; description: string; rate: number; type: string }[] {
    return [
      { code: '312', description: 'Retención en la Fuente - Servicios', rate: 1, type: 'SOURCE' },
      { code: '344', description: 'Retención IVA - Servicios', rate: 30, type: 'IVA' },
      { code: '401', description: 'Retención IVA - Compras', rate: 30, type: 'IVA' },
      { code: '402', description: 'Retención IVA - Importaciones', rate: 10, type: 'IVA' },
      { code: '403', description: 'Retención IVA - Arrendamientos', rate: 10, type: 'IVA' },
    ];
  }

  getRetentionCode(code: string): { code: string; description: string; rate: number; type: string } | null {
    const codes = this.getRetentionCodes();
    return codes.find((c) => c.code === code) || null;
  }
}

