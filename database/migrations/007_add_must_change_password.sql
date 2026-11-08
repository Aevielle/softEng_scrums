-- Migration: 007_add_must_change_password.sql
-- Fixes Issue #65: Missing column required for login, set-password, and reset-password routes

ALTER TABLE public.app_user 
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.app_user.must_change_password IS 'Flag indicating if the user is required to change password on next login';