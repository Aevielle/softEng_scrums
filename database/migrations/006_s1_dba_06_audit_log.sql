-- 1. Create audit_log Table (if not existing)
CREATE TABLE IF NOT EXISTS audit_log (
    audit_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    table_name  VARCHAR(50) NOT NULL,
    action      VARCHAR(7)  NOT NULL CHECK (action IN ('ADD','EDIT','DELETE','RESTORE')),
    record_key  TEXT,
    old_values  JSONB,
    new_values  JSONB,
    action_by   VARCHAR(50) NOT NULL,
    user_id     INT REFERENCES app_user(user_id) ON DELETE SET NULL,
    action_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Helper function to get logged-in user ID from app session
CREATE OR REPLACE FUNCTION audit_user_id() RETURNS INT
LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_user_id INT;
BEGIN
    BEGIN
        v_user_id := NULLIF(current_setting('app.current_user_id', true), '')::INT;
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;
    RETURN v_user_id;
END;
$$;

-- 3. Corrected Trigger Function
CREATE OR REPLACE FUNCTION trg_audit_log() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    v_action TEXT;
    v_uid    INT;
BEGIN
    v_uid := audit_user_id();

    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, action, old_values, new_values, action_by, user_id)
        VALUES (TG_TABLE_NAME, 'ADD', NULL, to_jsonb(NEW), current_user, v_uid);
    ELSIF TG_OP = 'UPDATE' THEN
        v_action := 'EDIT';
        INSERT INTO audit_log (table_name, action, old_values, new_values, action_by, user_id)
        VALUES (TG_TABLE_NAME, v_action, to_jsonb(OLD), to_jsonb(NEW), current_user, v_uid);
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, action, old_values, new_values, action_by, user_id)
        VALUES (TG_TABLE_NAME, 'DELETE', to_jsonb(OLD), NULL, current_user, v_uid);
    END IF;
    RETURN NULL;
END;
$$;

-- 4. Append-Only Protection
CREATE OR REPLACE FUNCTION trg_protect_audit_log() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'audit_log is append-only.';
END;
$$;

DROP TRIGGER IF EXISTS audit_log_protect_row ON audit_log;
CREATE TRIGGER audit_log_protect_row
    BEFORE UPDATE OR DELETE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION trg_protect_audit_log();

DROP TRIGGER IF EXISTS audit_log_protect_truncate ON audit_log;
CREATE TRIGGER audit_log_protect_truncate
    BEFORE TRUNCATE ON audit_log
    FOR EACH STATEMENT EXECUTE FUNCTION trg_protect_audit_log();