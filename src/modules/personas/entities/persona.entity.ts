import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { AutorizacionSri } from './autorizacion-sri.entity';

@Entity('personas')
export class Persona {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: 'Activo' })
  estado: string;

  @Column({ default: 'Natural' })
  tipo: string;

  @Column({ name: 'contribuyente_especial', default: false })
  contribuyenteEspecial: boolean;

  @Column({ nullable: true })
  ruc: string;

  @Column({ nullable: true })
  cedula: string;

  @Column()
  nombre: string;

  @Column({ name: 'nombre_comercial', nullable: true })
  nombreComercial: string;

  @Column({ nullable: true })
  telefonos: string;

  @Column({ type: 'text', nullable: true })
  direccion: string;

  @Column({ default: false })
  extranjero: boolean;

  @Column({ name: 'persona_asociada_id', type: 'uuid', nullable: true })
  personaAsociadaId: string;

  @Column({ name: 'categoria_id', type: 'uuid', nullable: true })
  categoriaId: string;

  @Column({ type: 'text', nullable: true })
  emails: string;

  @Column({ name: 'es_cliente', default: false })
  esCliente: boolean;

  @Column({ name: 'es_proveedor', default: false })
  esProveedor: boolean;

  @Column({ name: 'es_empleado', default: false })
  esEmpleado: boolean;

  @Column({ name: 'es_accionista', default: false })
  esAccionista: boolean;

  @Column({ name: 'es_vendedor', default: false })
  esVendedor: boolean;

  @Column({ name: 'cli_cuenta_por_cobrar_id', type: 'uuid', nullable: true })
  cliCuentaPorCobrarId: string;

  @Column({ name: 'cli_vendedor_id', type: 'uuid', nullable: true })
  cliVendedorId: string;

  @Column({ name: 'cli_descuento', type: 'decimal', precision: 10, scale: 2, nullable: true })
  cliDescuento: number;

  @Column({ name: 'cli_para_exportacion', default: false })
  cliParaExportacion: boolean;

  @Column({ name: 'cli_centro_costo_id', type: 'uuid', nullable: true })
  cliCentroCostoId: string;

  @Column({ name: 'cli_saldo_inicial', type: 'decimal', precision: 12, scale: 2, nullable: true })
  cliSaldoInicial: number;

  @Column({ name: 'cli_pvp_por_defecto', nullable: true })
  cliPvpPorDefecto: string;

  @Column({ name: 'cli_cupo_credito', default: false })
  cliCupoCredito: boolean;

  @Column({ name: 'prov_cuenta_por_pagar_id', type: 'uuid', nullable: true })
  provCuentaPorPagarId: string;

  @Column({ name: 'prov_cuenta_recurrente_id', type: 'uuid', nullable: true })
  provCuentaRecurrenteId: string;

  @Column({ name: 'prov_centro_costo_id', type: 'uuid', nullable: true })
  provCentroCostoId: string;

  @Column({ name: 'prov_cta_relacionada', default: false })
  provCtaRelacionada: boolean;

  @Column({ name: 'prov_artesano', default: false })
  provArtesano: boolean;

  @Column({ name: 'prov_saldo_inicial', type: 'decimal', precision: 12, scale: 2, nullable: true })
  provSaldoInicial: number;

  @Column({ name: 'prov_ret_ir_id', type: 'uuid', nullable: true })
  provRetIrId: string;

  @Column({ name: 'prov_ret_iva_id', type: 'uuid', nullable: true })
  provRetIvaId: string;

  @Column({ name: 'emp_contrato', nullable: true })
  empContrato: string;

  @Column({ name: 'emp_sueldo', type: 'decimal', precision: 10, scale: 2, nullable: true })
  empSueldo: number;

  @Column({ name: 'acc_cuenta_por_pagar_id', type: 'uuid', nullable: true })
  accCuentaPorPagarId: string;

  @Column({ name: 'banco_id', type: 'uuid', nullable: true })
  bancoId: string;

  @Column({ name: 'tipo_cuenta_bancaria', nullable: true })
  tipoCuentaBancaria: string;

  @Column({ name: 'n_cuenta_bancaria', nullable: true })
  nCuentaBancaria: string;

  @Column({ name: 'ref_bco_internacional', type: 'text', nullable: true })
  refBcoInternacional: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => AutorizacionSri, autorizacion => autorizacion.persona, { cascade: true })
  autorizacionesSri: AutorizacionSri[];
}
