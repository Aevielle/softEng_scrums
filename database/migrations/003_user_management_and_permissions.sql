-- Migration 003: Roles, Modules, Rights Catalogue, and User Permissions Setup

-- 1. Create Roles Table & Seed Data
CREATE TABLE IF NOT EXISTS role (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO role (role_id, role_name, description) VALUES
    (1, 'SUPERADMIN', 'Super administrator with full system access'),
    (2, 'ADMIN', 'System administrator role'),
    (3, 'USER', 'Default standard user role for registration')
ON CONFLICT (role_name) DO UPDATE
SET description = EXCLUDED.description;


-- 2. Create Modules Table & Seed Data (5 Modules)
CREATE TABLE IF NOT EXISTS module (
    module_id SERIAL PRIMARY KEY,
    module_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO module (module_id, module_name, description) VALUES
    (1, 'Customer', 'Customer management module'),
    (2, 'Product', 'Product inventory and catalog management'),
    (3, 'Human Resources', 'HR and employee management'),
    (4, 'Sales', 'Sales transactions and orders'),
    (5, 'Reports', 'System analytics and reports')
ON CONFLICT (module_name) DO UPDATE
SET description = EXCLUDED.description;


-- 3. Create Rights Catalogue Table & Seed Data (36 Action Rights)
CREATE TABLE IF NOT EXISTS rights_catalogue (
    right_id SERIAL PRIMARY KEY,
    module_id INT REFERENCES module(module_id) ON DELETE CASCADE,
    right_code VARCHAR(100) UNIQUE NOT NULL,
    right_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO rights_catalogue (module_id, right_code, right_name, description) VALUES
-- Customer Module Rights
(1, 'CUST_VIEW', 'View Customers', 'Ability to view customer records'),
(1, 'CUST_CREATE', 'Create Customer', 'Ability to add new customers'),
(1, 'CUST_EDIT', 'Edit Customer', 'Ability to update existing customers'),
(1, 'CUST_DELETE', 'Delete Customer', 'Ability to remove customer records'),
(1, 'CUST_EXPORT', 'Export Customers', 'Ability to export customer data'),
(1, 'CUST_IMPORT', 'Import Customers', 'Ability to import customer data'),
(1, 'CUST_AUDIT', 'Audit Customer Logs', 'Ability to view audit logs for customers'),

-- Product Module Rights
(2, 'PROD_VIEW', 'View Products', 'Ability to view product list'),
(2, 'PROD_CREATE', 'Create Product', 'Ability to add new products'),
(2, 'PROD_EDIT', 'Edit Product', 'Ability to edit product details'),
(2, 'PROD_DELETE', 'Delete Product', 'Ability to delete products'),
(2, 'PROD_ADJUST_STOCK', 'Adjust Product Stock', 'Ability to manage inventory levels'),
(2, 'PROD_CATEGORIZE', 'Manage Categories', 'Ability to manage product categories'),
(2, 'PROD_PRICE_UPDATE', 'Update Pricing', 'Ability to adjust product prices'),

-- Human Resources Module Rights
(3, 'HR_VIEW_EMP', 'View Employees', 'Ability to view employee directory'),
(3, 'HR_ADD_EMP', 'Add Employee', 'Ability to onboard new employees'),
(3, 'HR_EDIT_EMP', 'Edit Employee', 'Ability to modify employee profiles'),
(3, 'HR_DEL_EMP', 'Delete Employee', 'Ability to remove employee accounts'),
(3, 'HR_VIEW_PAYROLL', 'View Payroll', 'Ability to access salary details'),
(3, 'HR_MANAGE_ROLES', 'Manage User Roles', 'Ability to assign user roles and permissions'),
(3, 'HR_VIEW_ATTENDANCE', 'View Attendance', 'Ability to track attendance logs'),

-- Sales Module Rights
(4, 'SALES_VIEW', 'View Sales', 'Ability to view sales orders'),
(4, 'SALES_CREATE', 'Create Sales Order', 'Ability to issue sales transactions'),
(4, 'SALES_EDIT', 'Edit Sales Order', 'Ability to modify existing sales records'),
(4, 'SALES_CANCEL', 'Cancel Sales Order', 'Ability to cancel orders'),
(4, 'SALES_DISCOUNT', 'Apply Discounts', 'Ability to authorize transaction discounts'),
(4, 'SALES_REFUND', 'Process Refunds', 'Ability to process sales refunds'),
(4, 'SALES_INVOICE', 'Generate Invoices', 'Ability to print/export invoices'),

-- Reports Module Rights
(5, 'REP_VIEW_FINANCIAL', 'View Financial Reports', 'Ability to view monetary metrics'),
(5, 'REP_VIEW_SALES', 'View Sales Reports', 'Ability to analyze sales performance'),
(5, 'REP_VIEW_INVENTORY', 'View Inventory Reports', 'Ability to inspect stock movements'),
(5, 'REP_VIEW_HR', 'View HR Reports', 'Ability to generate workforce summaries'),
(5, 'REP_EXPORT', 'Export Reports', 'Ability to download generated reports'),
(5, 'REP_CUSTOMIZE', 'Customize Reports', 'Ability to modify report criteria'),
(5, 'REP_SCHEDULE', 'Schedule Reports', 'Ability to set up automated report dispatch'),
(5, 'REP_AUDIT_LOGS', 'View System Audit Logs', 'Ability to review complete system audit trails')
ON CONFLICT (right_code) DO UPDATE
SET right_name = EXCLUDED.right_name,
description = EXCLUDED.description;


-- 4. Create User Permission / Mapping Table
CREATE TABLE IF NOT EXISTS user_permission (
    permission_id SERIAL PRIMARY KEY,
    role_id INT REFERENCES role(role_id) ON DELETE CASCADE,
    right_id INT REFERENCES rights_catalogue(right_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role_id, right_id)
    );

-- Superadmin gets all 36 rights automatically
INSERT INTO user_permission (role_id, right_id)
SELECT 1, right_id FROM rights_catalogue
    ON CONFLICT (role_id, right_id) DO NOTHING;