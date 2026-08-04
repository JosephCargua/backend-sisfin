import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankTransaction } from '../entities/bank-transaction.entity';
import { BankAccount } from '../entities/bank-account.entity';

@Injectable()
export class CobrosPagosService {
  constructor(
    @InjectRepository(BankTransaction)
    private transactionRepo: Repository<BankTransaction>,
    @InjectRepository(BankAccount)
    private bankAccountRepo: Repository<BankAccount>
  ) {}

  async findAll(filters: any) {
    const query = this.transactionRepo.createQueryBuilder('tx')
      .leftJoinAndMapOne('tx.bankAccount', BankAccount, 'acc', 'acc.id = tx.bankAccountId')
      .orderBy('tx.date', 'DESC')
      .addOrderBy('tx.createdAt', 'DESC');

    // Mapear filtros si existen (simplificado)
    if (filters.tipo && filters.tipo !== 'Todos') {
      query.andWhere('tx.transactionType = :tipo', { tipo: filters.tipo });
    }
    if (filters.desde) {
      query.andWhere('tx.date >= :desde', { desde: filters.desde });
    }
    if (filters.hasta) {
      query.andWhere('tx.date <= :hasta', { hasta: filters.hasta });
    }

    const txs = await query.getMany();

    // Formatear salida
    return txs.map(tx => ({
      id: tx.id,
      emision: tx.date,
      comprobante: tx.checkNumber || 'S/N', // En el futuro generar secuencia
      tipoTransaccion: tx.transactionType, // 'Ingreso' o 'Egreso'
      persona: tx.personName || 'Sin asignar',
      transaccionStr: `${tx.paymentMethod || 'Transacción'} # ${tx.checkNumber || ''}`,
      cuentaStr: (tx as any).bankAccount ? (tx as any).bankAccount.bankName : 'Caja / Bancos',
      total: tx.amount
    }));
  }
}
