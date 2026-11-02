BEGIN;

CREATE TABLE IF NOT EXISTS public.role (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO public.role (role_name, description)
VALUES 
    ('Superadmin', 'Full system access across all modules and configuration'),
    ('Admin', 'Administrative access to manage module resources and users'),
    ('User', 'Standard user role assigned by default upon registration')
ON CONFLICT (role_name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.app_user (
    user_id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT REFERENCES public.role(role_id) ON DELETE SET NULL,
    is_blocked BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.module (
    module_id SERIAL PRIMARY KEY,
    module_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO public.module (module_name, description)
VALUES 
    ('Customer', 'Customer management and CRM features'),
    ('Product', 'Product catalog, pricing, and inventory management'),
    ('Human Resources', 'Employee records, jobs, and department management'),
    ('Sales', 'Sales orders, invoices, and transaction processing'),
    ('Reports', 'Business intelligence, analytics, and data reporting')
ON CONFLICT (module_name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.rights_catalogue (
    right_id SERIAL PRIMARY KEY,
    module_id INT REFERENCES public.module(module_id) ON DELETE CASCADE,
    right_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

WITH module_map AS (
    SELECT module_id, module_name FROM public.module
)
INSERT INTO public.rights_catalogue (module_id, right_name, description)
SELECT m.module_id, r.right_name, r.description
FROM (
    VALUES 
        ('Customer', 'Add Customer', 'Add new customer records'),
        ('Customer', 'Edit Customer', 'Update existing customer information'),
        ('Customer', 'Delete Customer', 'Remove customer records'),

        ('Product', 'Add Product', 'Add new product entries'),
        ('Product', 'Edit Product', 'Update product attributes and descriptions'),
        ('Product', 'Delete Product', 'Remove product entries from catalog'),
        ('Product', 'Add Price', 'Add product price records'),
        ('Product', 'Edit Price', 'Update base product prices'),
        ('Product', 'Delete Price', 'Remove product price records'),

        ('Human Resources', 'Add Job', 'Add new job titles'),
        ('Human Resources', 'Edit Job', 'Update job details'),
        ('Human Resources', 'Delete Job', 'Remove job records'),
        ('Human Resources', 'Add Department', 'Create department structures'),
        ('Human Resources', 'Edit Department', 'Update department information'),
        ('Human Resources', 'Delete Department', 'Remove department records'),
        ('Human Resources', 'Add Employee', 'Add new employee profile'),
        ('Human Resources', 'Edit Employee', 'Update employee details and credentials'),
        ('Human Resources', 'Delete Employee', 'Remove employee profiles'),
        ('Human Resources', 'View Job History', 'View historical job transitions for employees'),
        ('Human Resources', 'Add Job History', 'Add historical job transitions'),
        ('Human Resources', 'Edit Job History', 'Update job transition records'),
        ('Human Resources', 'Delete Job History', 'Remove job history records'),

        ('Sales', 'Add Sale', 'Process new sales transactions'),
        ('Sales', 'Edit Sale', 'Modify pending sales orders'),
        ('Sales', 'Delete Sale', 'Void or delete sales transactions'),
        ('Sales', 'View Sale Details', 'View itemized sale details and lines'),
        ('Sales', 'Add Sale Detail', 'Add items to sale transaction'),
        ('Sales', 'Edit Sale Detail', 'Modify sale transaction items'),
        ('Sales', 'Delete Sale Detail', 'Remove items from sale transaction'),

        ('Reports', 'Top Customers', 'Access top customers reports'),
        ('Reports', 'Top Products', 'Access top products reports'),
        ('Reports', 'All Employees', 'Access all employees reports'),
        ('Reports', 'Top Sales', 'Access top sales reports'),
        ('Reports', 'Product Master List', 'Access product master list reports'),
        ('Reports', 'Active Employees', 'Access active employees reports'),
        ('Reports', 'Employee Job History', 'Access employee job history reports')
) AS r(module_name, right_name, description)
JOIN module_map m ON m.module_name = r.module_name;

CREATE TABLE IF NOT EXISTS public.user_permission (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES public.app_user(user_id) ON DELETE CASCADE,
    right_id INT REFERENCES public.rights_catalogue(right_id) ON DELETE CASCADE,
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, right_id)
);

INSERT INTO public.app_user (first_name, last_name, email, password_hash, role_id)
SELECT u.first_name, u.last_name, u.email, u.password_hash, r.role_id AS role_id
FROM (
    VALUES 
        ('Geliz', 'Ramos', 'geliz@hope.erp', 'PENDING_SETUP_HASH'),
        ('Aevielle', 'Team', 'aevielle@hope.erp', 'PENDING_SETUP_HASH'),
        ('Kim', 'Team', 'kim@hope.erp', 'PENDING_SETUP_HASH'),
        ('Paolo', 'Team', 'paolo@hope.erp', 'PENDING_SETUP_HASH'),
        ('Chesca', 'Team', 'chesca@hope.erp', 'PENDING_SETUP_HASH')
) AS u(first_name, last_name, email, password_hash)
CROSS JOIN (SELECT role_id FROM public.role WHERE role_name = 'Superadmin' LIMIT 1) r
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.user_permission (user_id, right_id)
SELECT u.user_id AS user_id, rc.right_id AS right_id
FROM public.app_user u
CROSS JOIN public.rights_catalogue rc
JOIN public.role r ON u.role_id = r.role_id
WHERE r.role_name = 'Superadmin'
ON CONFLICT (user_id, right_id) DO NOTHING;

COMMIT;