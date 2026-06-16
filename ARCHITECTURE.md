# Arquitectura del Sistema SISFIN Backend

## Visión General

El backend de SISFIN está construido siguiendo principios de integridad de datos, trazabilidad y transacciones ACID. Cada operación crítica está protegida por transacciones de base de datos para garantizar consistencia.

## Estructura de Módulos

### 1. Módulo Contable (Accounting) - P0 ✅ COMPLETO

**Entidades:**
- `Account`: Plan de cuentas jerárquico con niveles y tipos
- `JournalEntry`: Asientos contables con numeración automática
- `JournalEntryLine`: Líneas de asiento con validación de partida doble
- `Currency`: Gestión de monedas
- `ExchangeRate`: Historial de tipos de cambio

**Características Implementadas:**
- ✅ Creación de cuentas jerárquicas con validación
- ✅ Validación estricta de partida doble (diferencia máxima: 0.01)
- ✅ Numeración automática de asientos (JE-YYYYMM-######)
- ✅ Estados de asiento: DRAFT, POSTED, CANCELLED
- ✅ Anulación de asientos sin eliminación (trazabilidad)
- ✅ Libro Mayor con cálculo de saldos acumulados
- ✅ Soporte multimoneda con tipos de cambio históricos

**Transacciones ACID:**
- Creación de asientos: Validación + Guardado atómico
- Posteo de asientos: Verificación de estado + Actualización atómica
- Anulación: Registro de trazabilidad + Actualización atómica
- Creación de cuentas: Validación de jerarquía + Guardado atómico

### 2. Módulo de Automatización - ESTRUCTURA COMPLETA

**Entidades:**
- `AccountingTemplate`: Plantillas para automatizar asientos
- `AccountingTemplateLine`: Líneas de plantilla con fórmulas
- `PeriodLock`: Bloqueo de períodos contables
- `CostCenter`: Centros de costo jerárquicos

**Estado:** Estructura de entidades creada, servicios pendientes

### 3. Módulos Operativos - ESTRUCTURA COMPLETA

**Inventario:**
- `Product`: Productos con costo y stock
- `InventoryMovement`: Movimientos de inventario

**Cuentas por Cobrar:**
- `Customer`: Clientes
- `Invoice`: Facturas de clientes
- `Payment`: Pagos aplicados a facturas

**Cuentas por Pagar:**
- `Supplier`: Proveedores
- `SupplierInvoice`: Facturas de proveedores
- `SupplierPayment`: Pagos a proveedores

**Bancos y Caja:**
- `BankAccount`: Cuentas bancarias
- `CashAccount`: Cajas físicas
- `BankTransaction`: Transacciones bancarias
- `BankReconciliation`: Conciliaciones bancarias

**Estado:** Estructura de entidades creada, servicios y controladores pendientes

### 4. Módulos Tributarios y Reportes

**Tax Module:** Preparado para implementación SRI
**Reports Module:** Preparado para exportación PDF/Excel

## Principios de Diseño

### Integridad de Datos

1. **Transacciones ACID:** Todas las operaciones críticas usan QueryRunner con transacciones explícitas
2. **Validación de Partida Doble:** Validación estricta en cada asiento (diferencia máxima 0.01)
3. **Precisión Decimal:** Uso de Decimal.js para todos los cálculos monetarios
4. **Trazabilidad:** Campos createdBy, updatedBy, createdAt, updatedAt en todas las entidades críticas

### Validaciones

- **Códigos Únicos:** Índices únicos en códigos de cuenta, números de asiento
- **Integridad Referencial:** Foreign keys con cascadas apropiadas
- **Validación de Estado:** No se puede postear un asiento cancelado
- **Validación de Jerarquía:** No se pueden crear hijos de cuentas de movimiento

### Numeración Automática

- **Asientos:** Formato JE-YYYYMM-###### con secuencia por mes
- **Validación:** Verificación de unicidad dentro de transacción

## Flujo de Datos

### Creación de Asiento Contable

```
1. Validar partida doble (Débito = Crédito)
2. Iniciar transacción
3. Generar número de asiento único
4. Calcular totales
5. Guardar asiento y líneas
6. Commit transacción
7. Retornar asiento completo
```

### Posteo de Asiento

```
1. Iniciar transacción
2. Verificar que existe y no está cancelado
3. Validar partida doble nuevamente
4. Actualizar estado a POSTED
5. Commit transacción
```

### Anulación de Asiento

```
1. Iniciar transacción
2. Verificar que existe y no está cancelado
3. Registrar razón de anulación
4. Actualizar estado a CANCELLED
5. Registrar usuario y fecha de anulación
6. Commit transacción
```

## Seguridad y Auditoría

### Campos de Auditoría

Todas las entidades críticas incluyen:
- `createdAt`: Fecha de creación
- `updatedAt`: Fecha de última actualización
- `createdBy`: ID del usuario creador (preparado)
- `updatedBy`: ID del usuario que actualizó (preparado)

### Anulación vs Eliminación

Los asientos **NUNCA** se eliminan. Se anulan con:
- Estado CANCELLED
- Razón de anulación
- Usuario que anuló
- Fecha de anulación

Esto garantiza trazabilidad completa y cumplimiento legal.

## Próximos Pasos de Implementación

1. **Automatización:**
   - Servicio de plantillas contables
   - Motor de aplicación de plantillas
   - Servicio de cierre de período
   - Validación de bloqueos de período

2. **Módulos Operativos:**
   - Servicios completos de inventario con costo promedio
   - Servicios de cuentas por cobrar con aplicación de pagos
   - Servicios de cuentas por pagar con control de vencimientos
   - Servicios bancarios con conciliación

3. **Tributario:**
   - Generación de XML para facturación electrónica
   - Integración con Web Services SRI
   - Gestión de retenciones
   - Generación de ATS

4. **Reportes:**
   - Exportación a PDF (usando PDFKit)
   - Exportación a Excel (usando ExcelJS)
   - Reportes contables estándar

5. **Autenticación:**
   - JWT para autenticación
   - Roles y permisos
   - Middleware de autorización

## Consideraciones de Rendimiento

- **Índices:** Índices en campos de búsqueda frecuente (códigos, fechas, estados)
- **Relaciones:** Uso de eager loading solo cuando es necesario
- **Consultas:** QueryBuilder para consultas complejas del libro mayor
- **Transacciones:** Transacciones cortas para evitar bloqueos

## Testing

Estructura preparada para:
- Tests unitarios de servicios
- Tests de integración de transacciones
- Tests E2E de endpoints críticos

