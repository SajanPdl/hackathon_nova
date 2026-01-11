-- ===================================================
-- LIVE DATABASE UPDATE (INCREMENTAL)
-- Run this if you already have volunteers/attendance tables
-- ===================================================

BEGIN;

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENSURE COLUMNS EXIST (Idempotent)
ALTER TABLE volunteers_capec ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE volunteers_capec ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE volunteers_capec ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

ALTER TABLE volunteers_itecpec ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE volunteers_itecpec ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE volunteers_itecpec ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

ALTER TABLE attendance_capec ADD COLUMN IF NOT EXISTS admin_note TEXT;
ALTER TABLE attendance_itecpec ADD COLUMN IF NOT EXISTS admin_note TEXT;

-- 3. FIX AUDIT LOG (If old version exists)
-- This adds the columns expected by the new Edge Functions
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS target_type TEXT;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS target_id UUID;
ALTER TABLE audit_log ALTER COLUMN org SET NOT NULL;
ALTER TABLE audit_log ALTER COLUMN action SET NOT NULL;

-- 4. WHATSAPP ACTION LINK SYSTEM
CREATE TABLE IF NOT EXISTS action_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT UNIQUE NOT NULL,
    action_type TEXT NOT NULL,                
    target_table TEXT NOT NULL,               
    target_id uuid NOT NULL,
    payload jsonb DEFAULT '{}',               
    created_at timestamptz DEFAULT now(),
    expires_at timestamptz NOT NULL,
    used boolean DEFAULT false,
    used_at timestamptz,
    created_by text DEFAULT 'system',
    admin_pin text                            
);

CREATE TABLE IF NOT EXISTS notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    action_token_id uuid REFERENCES action_tokens(id),
    "to" text,                                
    message text,
    sent_at timestamptz,
    status text,                              
    created_at timestamptz DEFAULT now()
);

-- 5. UPDATE FUNCTIONS
CREATE OR REPLACE FUNCTION create_action_token(
    p_target_table TEXT, 
    p_target_id UUID, 
    p_action_type TEXT, 
    p_ttl_minutes INT, 
    p_payload JSONB DEFAULT '{}', 
    p_channel_hint TEXT DEFAULT 'whatsapp',
    p_admin_pin TEXT DEFAULT NULL
)
RETURNS TABLE (
    token TEXT,
    expires_at TIMESTAMPTZ
) AS $$
DECLARE
    v_token TEXT;
    v_expires_at TIMESTAMPTZ;
BEGIN
    v_token := encode(gen_random_bytes(32), 'base64');
    v_token := replace(replace(replace(v_token, '+', '-'), '/', '_'), '=', '');
    v_expires_at := now() + (p_ttl_minutes * interval '1 minute');

    INSERT INTO action_tokens (
        token, action_type, target_table, target_id, payload, expires_at, admin_pin
    ) VALUES (
        v_token, p_action_type, p_target_table, p_target_id, p_payload, v_expires_at, p_admin_pin
    );

    RETURN QUERY SELECT v_token, v_expires_at;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION apply_admin_action(
    p_token TEXT,
    p_action TEXT, 
    p_admin_notes TEXT DEFAULT ''
)
RETURNS VOID AS $$
DECLARE
    v_target_table TEXT;
    v_target_id UUID;
    v_token_id UUID;
BEGIN
    SELECT id, target_table, target_id INTO v_token_id, v_target_table, v_target_id
    FROM action_tokens
    WHERE token = p_token AND used = false AND expires_at > now();

    IF v_token_id IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired token';
    END IF;

    EXECUTE format('UPDATE %I SET status = %L, admin_note = %L WHERE id = %L', 
        v_target_table, 
        CASE WHEN p_action = 'approve' THEN 'approved' ELSE 'declined' END,
        p_admin_notes,
        v_target_id
    );

    UPDATE action_tokens SET used = true, used_at = now() WHERE id = v_token_id;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- Reload schema
NOTIFY pgrst, 'reload schema';
