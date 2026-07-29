-- ================================================================
-- MODULE 1 REFACTOR: POSTGRESQL DATABASE-LEVEL ROLE ACCESS CONTROL
-- ================================================================

-- 1. Create DB Role for Auth Service (Pure authentication via username + password_hash)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_auth_user') THEN
        CREATE ROLE app_auth_user WITH LOGIN PASSWORD 'AuthSecurePass2026!';
    END IF;
END
$$;

GRANT CONNECT ON DATABASE smart_logistics_db TO app_auth_user;
GRANT USAGE ON SCHEMA public TO app_auth_user;
GRANT SELECT, INSERT, UPDATE ON TABLE users TO app_auth_user;

-- 2. Create DB Role for Customer Portal API (Customers & Addresses & Orders)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_customer_user') THEN
        CREATE ROLE app_customer_user WITH LOGIN PASSWORD 'CustSecurePass2026!';
    END IF;
END
$$;

GRANT CONNECT ON DATABASE smart_logistics_db TO app_customer_user;
GRANT USAGE ON SCHEMA public TO app_customer_user;
GRANT SELECT, INSERT, UPDATE ON TABLE customers, customer_addresses, orders TO app_customer_user;
REVOKE ALL ON TABLE staff, users, system_settings FROM app_customer_user;

-- 3. Create DB Role for Staff / Hub Warehouse Operations API
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_staff_user') THEN
        CREATE ROLE app_staff_user WITH LOGIN PASSWORD 'StaffSecurePass2026!';
    END IF;
END
$$;

GRANT CONNECT ON DATABASE smart_logistics_db TO app_staff_user;
GRANT USAGE ON SCHEMA public TO app_staff_user;
GRANT SELECT, INSERT, UPDATE ON TABLE staff, customers, facilities, routes, route_stops, shipments, vehicles, orders, barcode_scans, delivery_proofs TO app_staff_user;
-- Revoke administrative tables from Staff DB Role
REVOKE ALL ON TABLE system_settings, roles, permissions, role_permissions FROM app_staff_user;

-- 4. Create DB Role for Admin Portal API (Full System Privileges)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_admin_user') THEN
        CREATE ROLE app_admin_user WITH LOGIN PASSWORD 'AdminSecurePass2026!';
    END IF;
END
$$;

GRANT CONNECT ON DATABASE smart_logistics_db TO app_admin_user;
GRANT USAGE ON SCHEMA public TO app_admin_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_admin_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_admin_user;
