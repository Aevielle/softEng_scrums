-- 1. Create role table
CREATE TABLE IF NOT EXISTS role (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default roles (including the default role required by registration)
INSERT INTO role (role_name, description)
VALUES
    ('CUSTOMER', 'Default standard user role for registration'),
    ('USER', 'Default standard user role for registration'),
    ('STAFF', 'Internal staff member role'),
    ('ADMIN', 'System administrator role')
ON CONFLICT (role_name) DO NOTHING;


-- 2. Create app_user table
CREATE TABLE IF NOT EXISTS app_user (
    user_id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT REFERENCES role(role_id) ON DELETE SET NULL,
    is_blocked BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- 3. Create module table
CREATE TABLE IF NOT EXISTS module (
    module_id SERIAL PRIMARY KEY,
    module_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO module (module_name, description)
VALUES
    ('Authentication', 'Login and registration module'),
    ('User Management', 'Manage user accounts and blocking'),
    ('Sales', 'Sales and payment processing module'),
    ('Inventory', 'Product catalog and pricing module')
ON CONFLICT (module_name) DO NOTHING;


-- 4. Create rights_catalogue table
CREATE TABLE IF NOT EXISTS rights_catalogue (
    right_id SERIAL PRIMARY KEY,
    module_id INT REFERENCES module(module_id) ON DELETE CASCADE,
    right_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO rights_catalogue (module_id, right_name, description)
VALUES
    (2, 'USER_VIEW', 'Can view list of system users'),
    (2, 'USER_EDIT', 'Can modify user roles and status'),
    (3, 'SALES_VIEW', 'Can view sales transactions'),
    (3, 'SALES_CREATE', 'Can record new sales and payments')
ON CONFLICT (right_name) DO NOTHING;


-- 5. Create user_permission table (with soft delete support)
CREATE TABLE IF NOT EXISTS user_permission (
    permission_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES app_user(user_id) ON DELETE CASCADE,
    right_id INT REFERENCES rights_catalogue(right_id) ON DELETE CASCADE,
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);