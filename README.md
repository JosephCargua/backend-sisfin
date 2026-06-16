# SISFIN Backend - Sistema Contable Profesional

Backend profesional construido con NestJS y PostgreSQL para un sistema contable completo, priorizando la integridad de datos y trazabilidad mediante transacciones ACID robustas.

## Características Principales

### 1. Núcleo Contable (P0 - Prioridad Máxima)

#### Plan de Cuentas (COA)
- Creación de cuentas jerárquicas (Activo, Pasivo, Patrimonio, Ingresos, Gastos)
- Soporte para niveles múltiples (Ej: 1.1.01.01)
- Cuentas de control (padres) y cuentas de movimiento (hijas)
- Validación de estructura jerárquica

#### Libro Diario (Journal Entries)
- Registro de asientos con validación estricta de partida doble (Débito - Crédito = 0)
- Numeración automática y secuencial de asientos (formato: JE-YYYYMM-######)
- Capacidad de "Anular" asientos sin borrarlos (integridad de datos)
- Estados: DRAFT, POSTED, CANCELLED

#### Libro Mayor
- Consulta de movimientos por cuenta individual en un rango de fechas
- Cálculo de saldos acumulados
- Filtrado por centros de costo

#### Soporte Multimoneda
- Gestión de múltiples monedas
- Registro de tipos de cambio históricos
- Soporte para expansión internacional

### 2. Automatización Contable

#### Motor de Plantillas Contables
- Configuración de qué cuentas se afectan según la acción (Venta, Compra, Pago, Cobro)
- Plantillas reutilizables con fórmulas

#### Cierre de Período
- Funcionalidad para bloquear ediciones en meses anteriores
- Asiento automático de cierre anual (preparado para implementación)

#### Centros de Costo
- Etiquetado de cada línea de un asiento para segmentar por departamento o proyecto
- Estructura jerárquica de centros de costo

### 3. Módulos Operativos

- **Inventario (Kárdex)**: Control de existencias mediante Costo Promedio Ponderado
- **Cuentas por Cobrar**: Seguimiento de saldos por cliente y pagos parciales
- **Cuentas por Pagar**: Registro de facturas de proveedores y control de vencimientos
- **Bancos y Caja**: Manejo de múltiples cuentas bancarias y cajas físicas con conciliación

### 4. Requerimientos Legales y Tributarios (Ecuador)

- Módulo preparado para facturación electrónica SRI
- Gestión de retenciones
- Anexo Transaccional Simplificado (ATS)
- Cálculo de impuestos (IVA 0%, 15%, Exento)

## Tecnologías

- **NestJS**: Framework Node.js progresivo
- **PostgreSQL**: Base de datos relacional robusta
- **TypeORM**: ORM con soporte completo de transacciones ACID
- **Decimal.js**: Precisión decimal para cálculos contables
- **Swagger**: Documentación automática de API
- **Class Validator**: Validación de DTOs

## Instalación

### Opción 1: PostgreSQL con Docker (Recomendado)

```bash
# 1. Iniciar PostgreSQL en Docker
docker-compose up -d

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
# El archivo .env.example ya tiene la configuración para Docker
# Crea tu archivo .env basándote en .env.example

# 4. Iniciar en desarrollo
npm run start:dev
```

**Nota**: Ver `DOCKER_SETUP.md` para más detalles sobre Docker.

### Opción 2: PostgreSQL Local

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de PostgreSQL local

# 3. Crear la base de datos manualmente
# Ver CREAR_BD_INSTRUCCIONES.md para más detalles

# 4. Iniciar en desarrollo
npm run start:dev
```

### Producción

```bash
npm run build
npm run start:prod
```

## Estructura del Proyecto

```
src/
├── config/              # Configuración de TypeORM y otros
├── modules/
│   ├── accounting/      # Núcleo contable (P0)
│   ├── automation/      # Plantillas, cierres, centros de costo
│   ├── inventory/       # Inventario y Kárdex
│   ├── receivables/     # Cuentas por cobrar
│   ├── payables/        # Cuentas por pagar
│   ├── banking/         # Bancos y caja
│   ├── tax/             # Módulo tributario SRI
│   └── reports/         # Reportes y exportaciones
└── main.ts              # Punto de entrada
```

## Integridad de Datos

El sistema utiliza transacciones de base de datos en todas las operaciones críticas:

- **Creación de asientos**: Validación de partida doble dentro de transacción
- **Posteo de asientos**: Verificación de estado y validación antes de confirmar
- **Anulación de asientos**: Registro de trazabilidad sin eliminar datos
- **Creación de cuentas**: Validación de jerarquía y códigos únicos

## API Endpoints Principales

### Plan de Cuentas
- `POST /accounts` - Crear cuenta
- `GET /accounts` - Listar todas las cuentas
- `GET /accounts/hierarchy` - Obtener jerarquía completa
- `GET /accounts/:id` - Obtener cuenta por ID

### Libro Diario
- `POST /journal-entries` - Crear asiento contable
- `GET /journal-entries` - Listar asientos
- `GET /journal-entries/:id` - Obtener asiento por ID
- `PATCH /journal-entries/:id/post` - Postear asiento
- `PATCH /journal-entries/:id/cancel` - Anular asiento
- `GET /journal-entries/general-ledger` - Consultar libro mayor

## Documentación API

Una vez iniciado el servidor, la documentación Swagger estará disponible en:
```
http://localhost:3000/api
```

## Variables de Entorno

### Para Docker (configuración por defecto)

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=sisfin
DB_PASSWORD=sisfin
DB_DATABASE=sisfin_db
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:4200
```

### Para PostgreSQL Local

Ajusta las credenciales según tu instalación local de PostgreSQL.

**Nota**: En desarrollo, TypeORM creará automáticamente las tablas (`synchronize: true`). En producción, usa migraciones.

## Próximos Pasos

1. Implementar servicios completos para módulos operativos
2. Desarrollar módulo de facturación electrónica SRI
3. Implementar generación de reportes PDF y Excel
4. Agregar autenticación y autorización
5. Implementar auditoría completa de cambios

## Notas Importantes

- **Precisión Decimal**: Todos los cálculos monetarios usan Decimal.js para evitar errores de punto flotante
- **Transacciones ACID**: Todas las operaciones críticas están envueltas en transacciones de base de datos
- **Trazabilidad**: Cada registro incluye información de creación y actualización
- **Validación Estricta**: La partida doble se valida en cada asiento (diferencia máxima: 0.01)

## Licencia

Privado - Uso interno

