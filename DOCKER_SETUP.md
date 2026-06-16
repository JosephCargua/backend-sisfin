# Configuración de PostgreSQL con Docker

Este documento explica cómo configurar y usar PostgreSQL en Docker para el proyecto SISFIN.

## Requisitos Previos

- Docker instalado en tu sistema
- Docker Compose instalado (generalmente viene con Docker Desktop)

## Pasos para Configurar

### 1. Iniciar el Contenedor de PostgreSQL

Desde la carpeta `BACK-SISFIN`, ejecuta:

```bash
docker-compose up -d
```

Este comando:
- Descarga la imagen de PostgreSQL 15 (si no la tienes)
- Crea un contenedor llamado `sisfin_postgres`
- Crea un volumen para persistir los datos
- Expone el puerto 5432 en tu máquina local

### 2. Verificar que el Contenedor Está Corriendo

```bash
docker-compose ps
```

Deberías ver el contenedor `sisfin_postgres` con estado "Up".

### 3. Ver los Logs del Contenedor

```bash
docker-compose logs -f postgres
```

### 4. Configurar el Archivo .env

Copia el archivo `.env.example` a `.env`:

```bash
cp .env.example .env
```

El archivo `.env` ya tiene la configuración correcta para conectarse al contenedor Docker:
- `DB_HOST=localhost` (el contenedor expone el puerto en localhost)
- `DB_PORT=5432`
- `DB_USERNAME=sisfin`
- `DB_PASSWORD=sisfin`
- `DB_DATABASE=sisfin_db`

### 5. Iniciar la Aplicación NestJS

Una vez que el contenedor esté corriendo, inicia tu aplicación:

```bash
npm run start:dev
```

TypeORM creará automáticamente las tablas en la base de datos cuando `NODE_ENV=development` (porque `synchronize: true` está activado en desarrollo).

## Comandos Útiles

### Detener el Contenedor

```bash
docker-compose down
```

### Detener y Eliminar los Datos (⚠️ CUIDADO: Esto borra la base de datos)

```bash
docker-compose down -v
```

### Reiniciar el Contenedor

```bash
docker-compose restart
```

### Acceder a la Base de Datos con psql

```bash
docker exec -it sisfin_postgres psql -U sisfin -d sisfin_db
```

### Ver el Estado del Contenedor

```bash
docker-compose ps
```

### Ver los Logs

```bash
docker-compose logs postgres
```

### Ver los Logs en Tiempo Real

```bash
docker-compose logs -f postgres
```

## Estructura de Datos

Los datos de PostgreSQL se almacenan en un volumen de Docker llamado `postgres_data`. Esto significa que:

- Los datos persisten aunque detengas el contenedor
- Los datos se eliminan solo si ejecutas `docker-compose down -v`
- Puedes hacer backup del volumen si es necesario

## Solución de Problemas

### El puerto 5432 ya está en uso

Si tienes PostgreSQL instalado localmente y está usando el puerto 5432, tienes dos opciones:

1. **Detener PostgreSQL local** (recomendado si solo usas Docker)
2. **Cambiar el puerto en docker-compose.yml**:
   ```yaml
   ports:
     - "5433:5432"  # Cambia 5433 por el puerto que prefieras
   ```
   Y actualiza `.env`:
   ```
   DB_PORT=5433
   ```

### El contenedor no inicia

Verifica los logs:
```bash
docker-compose logs postgres
```

### No puedo conectarme desde la aplicación

1. Verifica que el contenedor esté corriendo: `docker-compose ps`
2. Verifica que el puerto esté expuesto: `docker port sisfin_postgres`
3. Verifica las credenciales en tu archivo `.env`

### Reiniciar desde cero

Si necesitas empezar de nuevo con una base de datos limpia:

```bash
docker-compose down -v
docker-compose up -d
```

Esto eliminará todos los datos y creará un contenedor nuevo.

## Backup y Restore

### Hacer Backup de la Base de Datos

```bash
docker exec sisfin_postgres pg_dump -U sisfin sisfin_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restaurar un Backup

```bash
docker exec -i sisfin_postgres psql -U sisfin -d sisfin_db < backup.sql
```

## Producción

Para producción, considera:

1. Cambiar las credenciales por defecto
2. Usar variables de entorno para las credenciales
3. Configurar backups automáticos
4. Usar un volumen nombrado externo para mejor gestión
5. Configurar límites de recursos (CPU, memoria)

