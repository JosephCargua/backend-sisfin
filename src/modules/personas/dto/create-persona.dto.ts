import { IsString, IsBoolean, IsOptional, IsNumber, IsUUID, IsArray } from 'class-validator';

export class CreatePersonaDto {
  @IsString()
  @IsOptional()
  estado?: string;

  @IsString()
  @IsOptional()
  tipo?: string;

  @IsBoolean()
  @IsOptional()
  contribuyenteEspecial?: boolean;

  @IsString()
  @IsOptional()
  ruc?: string;

  @IsString()
  @IsOptional()
  cedula?: string;

  @IsString()
  nombre: string;

  @IsString()
  @IsOptional()
  nombreComercial?: string;

  @IsString()
  @IsOptional()
  telefonos?: string;

  @IsString()
  @IsOptional()
  direccion?: string;

  @IsBoolean()
  @IsOptional()
  extranjero?: boolean;

  @IsUUID()
  @IsOptional()
  personaAsociadaId?: string;

  @IsUUID()
  @IsOptional()
  categoriaId?: string;

  @IsString()
  @IsOptional()
  emails?: string;

  @IsBoolean()
  @IsOptional()
  esCliente?: boolean;

  @IsBoolean()
  @IsOptional()
  esProveedor?: boolean;

  @IsBoolean()
  @IsOptional()
  esEmpleado?: boolean;

  @IsBoolean()
  @IsOptional()
  esAccionista?: boolean;

  @IsBoolean()
  @IsOptional()
  esVendedor?: boolean;

  @IsUUID()
  @IsOptional()
  cliCuentaPorCobrarId?: string;

  @IsUUID()
  @IsOptional()
  cliVendedorId?: string;

  @IsNumber()
  @IsOptional()
  cliDescuento?: number;

  @IsBoolean()
  @IsOptional()
  cliParaExportacion?: boolean;

  @IsUUID()
  @IsOptional()
  cliCentroCostoId?: string;

  @IsNumber()
  @IsOptional()
  cliSaldoInicial?: number;

  @IsString()
  @IsOptional()
  cliPvpPorDefecto?: string;

  @IsBoolean()
  @IsOptional()
  cliCupoCredito?: boolean;

  @IsUUID()
  @IsOptional()
  provCuentaPorPagarId?: string;

  @IsUUID()
  @IsOptional()
  provCuentaRecurrenteId?: string;

  @IsUUID()
  @IsOptional()
  provCentroCostoId?: string;

  @IsBoolean()
  @IsOptional()
  provCtaRelacionada?: boolean;

  @IsBoolean()
  @IsOptional()
  provArtesano?: boolean;

  @IsNumber()
  @IsOptional()
  provSaldoInicial?: number;

  @IsUUID()
  @IsOptional()
  provRetIrId?: string;

  @IsUUID()
  @IsOptional()
  provRetIvaId?: string;

  @IsString()
  @IsOptional()
  empContrato?: string;

  @IsNumber()
  @IsOptional()
  empSueldo?: number;

  @IsUUID()
  @IsOptional()
  accCuentaPorPagarId?: string;

  @IsUUID()
  @IsOptional()
  bancoId?: string;

  @IsString()
  @IsOptional()
  tipoCuentaBancaria?: string;

  @IsString()
  @IsOptional()
  nCuentaBancaria?: string;

  @IsString()
  @IsOptional()
  refBcoInternacional?: string;

  @IsArray()
  @IsOptional()
  autorizacionesSri?: any[];
}
