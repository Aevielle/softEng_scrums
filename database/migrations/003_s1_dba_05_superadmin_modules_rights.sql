-- ============================================================================
-- Migration: 003_user_management_and_permissions.sql
-- Issue: S1-DBA-05 #40 (Seed roles, 5 core modules, 36 rights, and superadmins)
-- Description: Creates user permissions schema and seeds initial official data.
-- Idempotency: Uses CREATE TABLE IF NOT EXISTS and ON CONFLICT DO NOTHING.
-- Security: NO PASSWORDS HARDCODED. Passwords are set upon first login/auth flow.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Create and Seed Role Table
-- Default role for new user registration (e.g., Paolo's Register) is 'User'
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.role (
    id SERIAL PRIMARY KEY,
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

-- ----------------------------------------------------------------------------
-- 2. Create App User Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_user (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    role_id INT REFERENCES public.role(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    is_blocked BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 3. Create and Seed 5 Core Modules
-- (Customer, Product, Human Resources, Sales, Reports)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.module (
    id SERIAL PRIMARY KEY,
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

-- ----------------------------------------------------------------------------
-- 4. Create and Seed 36 Per-Action Rights (Section 3.8 Guide)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rights_catalogue (
    id SERIAL PRIMARY KEY,
    module_id INT REFERENCES public.module(id) ON DELETE CASCADE,
    right_code VARCHAR(100) NOT NULL UNIQUE,
    right_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

WITH module_map AS (
    SELECT id AS module_id, module_name FROM public.module
)
INSERT INTO public.rights_catalogue (module_id, right_code, right_name, description)
SELECT m.module_id, r.right_code, r.right_name, r.description
FROM (
    VALUES 
        -- Customer Module (1-7)
        ('Customer', 'CUST_VIEW', 'View Customer', 'View customer details and lists'),
        ('Customer', 'CUST_CREATE', 'Create Customer', 'Add new customer records'),
        ('Customer', 'CUST_EDIT', 'Edit Customer', 'Update existing customer information'),
        ('Customer', 'CUST_DELETE', 'Delete Customer', 'Soft delete or remove customer records'),
        ('Customer', 'CUST_EXPORT', 'Export Customers', 'Export customer list to external format'),
        ('Customer', 'CUST_IMPORT', 'Import Customers', 'Bulk import customer data'),
        ('Customer', 'CUST_HIST', 'View Customer History', 'View transaction history of customers'),

        -- Product Module (8-14)
        ('Product', 'PROD_VIEW', 'View Product', 'View product catalog and inventory details'),
        ('Product', 'PROD_CREATE', 'Create Product', 'Add new product entries'),
        ('Product', 'PROD_EDIT', 'Edit Product', 'Update product attributes and descriptions'),
        ('Product', 'PROD_DELETE', 'Delete Product', 'Remove product entries from catalog'),
        ('Product', 'PROD_PRICE_EDIT', 'Edit Product Price', 'Update base product prices and history'),
        ('Product', 'PROD_STOCK_ADJ', 'Adjust Stock', 'Modify physical stock counts'),
        ('Product', 'PROD_EXPORT', 'Export Products', 'Export inventory and product lists'),

        -- Human Resources Module (15-22)
        ('Human Resources', 'HR_EMP_VIEW', 'View Employee', 'View employee profiles and personnel lists'),
        ('Human Resources', 'HR_EMP_CREATE', 'Create Employee', 'Add new employee profile'),
        ('Human Resources', 'HR_EMP_EDIT', 'Edit Employee', 'Update employee details and credentials'),
        ('Human Resources', 'HR_EMP_DELETE', 'Delete Employee', 'Deactivate or remove employee profiles'),
        ('Human Resources', 'HR_DEPT_MANAGE', 'Manage Departments', 'Create or update department structures'),
        ('Human Resources', 'HR_JOB_MANAGE', 'Manage Jobs', 'Configure job titles and pay grades'),
        ('Human Resources', 'HR_HIST_VIEW', 'View Job History', 'View historical job transitions for employees'),
        ('Human Resources', 'HR_REPORT_GEN', 'Generate HR Reports', 'Access specialized HR metrics'),

        -- Sales Module (23-30)
        ('Sales', 'SALE_VIEW', 'View Sales', 'View sales records and invoices'),
        ('Sales', 'SALE_CREATE', 'Create Sale', 'Process new sales transactions'),
        ('Sales', 'SALE_EDIT', 'Edit Sale', 'Modify pending or draft sales orders'),
        ('Sales', 'SALE_CANCEL', 'Cancel Sale', 'Void or cancel active sales transactions'),
        ('Sales', 'SALE_PAY_RECORD', 'Record Payment', 'Log customer payments against invoices'),
        ('Sales', 'SALE_PAY_VIEW', 'View Payments', 'View transaction payment histories'),
        ('Sales', 'SALE_DISC_APPLY', 'Apply Discounts', 'Authorize and apply order discounts'),
        ('Sales', 'SALE_EXPORT', 'Export Sales Data', 'Export sales ledgers and detail reports'),

        -- Reports Module (31-36)
        ('Reports', 'REP_FIN_VIEW', 'View Financial Reports', 'Access financial summaries and revenue metrics'),
        ('Reports', 'REP_SALES_GEN', 'Generate Sales Reports', 'Build custom sales analysis reports'),
        ('Reports', 'REP_INV_VIEW', 'View Inventory Reports', 'Generate stock valuation and turnover reports'),
        ('Reports', 'REP_AUDIT_VIEW', 'View Audit Logs', 'Inspect system access and mutation logs'),
        ('Reports', 'REP_EXPORT', 'Export Reports', 'Export system analytics to PDF/Excel'),
        ('Reports', 'REP_CUSTOM_BUILD', 'Build Custom Query', 'Construct custom analytical reports')
) AS r(module_name, right_code, right_name, description)
JOIN module_map m ON m.module_name = r.module_name
ON CONFLICT (right_code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5. Create User Permission Table (Soft Delete Support)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_permission (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES public.app_user(id) ON DELETE CASCADE,
    right_id INT REFERENCES public.rights_catalogue(id) ON DELETE CASCADE,
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, right_id)
);

-- ----------------------------------------------------------------------------
-- 6. Seed Superadmin Accounts for Team Members
-- Passwords left empty/null. Set on first login/auth configuration.
-- ----------------------------------------------------------------------------
INSERT INTO public.app_user (username, email, role_id, is_active)
SELECT u.username, u.email, r.id AS role_id, true
FROM (
    VALUES 
        ('geliz', 'geliz@hope.erp'),
        ('aevielle', 'aevielle@hope.erp'),
        ('kim', 'kim@hope.erp'),
        ('paolo', 'paolo@hope.erp'),
        ('chesca', 'chesca@hope.erp')
) AS u(username, email)
CROSS JOIN (SELECT id FROM public.role WHERE role_name = 'Superadmin' LIMIT 1) r
ON CONFLICT (username) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 7. Grant Superadmin All 36 Rights
-- ----------------------------------------------------------------------------
INSERT INTO public.user_permission (user_id, right_id)
SELECT u.id AS user_id, rc.id AS right_id
FROM public.app_user u
CROSS JOIN public.rights_catalogue rc
JOIN public.role r ON u.role_id = r.id
WHERE r.role_name = 'Superadmin'
ON CONFLICT (user_id, right_id) DO NOTHING;

COMMIT;