-- Script para otorgar permisos al usuario sisfin en el esquema public
-- Ejecuta este script como superusuario (postgres) después de crear el usuario

-- Conectarse a la base de datos sisfin_db
\c sisfin_db

-- Otorgar permisos en el esquema public
GRANT ALL ON SCHEMA public TO sisfin;
GRANT CREATE ON SCHEMA public TO sisfin;

-- Otorgar permisos en todas las tablas existentes y futuras
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO sisfin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO sisfin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO sisfin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TYPES TO sisfin;

-- Si ya existen tablas, otorgar permisos explícitamente
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO sisfin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO sisfin;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO sisfin;
GRANT ALL PRIVILEGES ON ALL TYPES IN SCHEMA public TO sisfin;

