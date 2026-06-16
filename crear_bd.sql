-- Script para crear la base de datos y usuario de SISFIN
-- Ejecuta este script en PostgreSQL como superusuario (postgres)

-- Crear el usuario/rol
CREATE USER sisfin WITH PASSWORD 'sisfin';

-- Crear la base de datos
CREATE DATABASE sisfin_db OWNER sisfin;

-- Otorgar privilegios en la base de datos
GRANT ALL PRIVILEGES ON DATABASE sisfin_db TO sisfin;

-- Conectarse a la base de datos
\c sisfin_db

-- Otorgar privilegios en el esquema público (CRÍTICO)
GRANT ALL ON SCHEMA public TO sisfin;
GRANT CREATE ON SCHEMA public TO sisfin;

-- Otorgar privilegios por defecto para objetos futuros
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO sisfin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO sisfin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO sisfin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TYPES TO sisfin;

