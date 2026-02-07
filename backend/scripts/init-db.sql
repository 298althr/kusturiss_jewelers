-- Initial database setup
-- This script runs once when the container is created

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- The rest will be handled by the migration runner during app startup
