DO $$ BEGIN
IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='salmonel_reader') THEN CREATE ROLE salmonel_reader LOGIN; END IF;
END $$;
ALTER ROLE salmonel_reader NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
ALTER ROLE salmonel_reader SET default_transaction_read_only = on;
ALTER ROLE salmonel_reader SET statement_timeout = '3s';
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT CONNECT ON DATABASE salmonel TO salmonel_reader;
GRANT USAGE ON SCHEMA public TO salmonel_reader;
GRANT SELECT ON salmonel TO salmonel_reader;
