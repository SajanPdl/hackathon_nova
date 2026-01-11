-- ===================================================
-- MASTER LIVE DATABASE SETUP (CONSOLIDATED)
-- Project: Volunteer Attendance Portal
-- Includes: Core Schema, Audit Logs, WhatsApp Actions, and RLS
-- ===================================================

BEGIN;

-- 1. SETUP EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. SHARED UTILITIES
CREATE OR REPLACE FUNCTION generate_unique_code()
RETURNS text AS $$
DECLARE
  chars text[] := '{0,1,2,3,4,5,6,7,8,9,A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z}';
  result text := '';
  i integer := 0;
BEGIN
    result := '';
    for i in 1..8 loop
      result := result || chars[1+floor(random()*array_length(chars, 1))::integer];
    end loop;
    return result;
END;
$$ LANGUAGE plpgsql;

-- 3. CORE TABLES (CAPEC)
CREATE TABLE IF NOT EXISTS volunteers_capec (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    phone text,
    email text,
    role text DEFAULT 'volunteer',
    unique_code text NOT NULL UNIQUE DEFAULT generate_unique_code(),
    active boolean DEFAULT true,
    profile_image_url text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance_capec (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    volunteer_id uuid REFERENCES volunteers_capec(id) ON DELETE CASCADE,
    unique_code text NOT NULL,
    device_id text,
    entry_time timestamptz NOT NULL,
    exit_time timestamptz,
    duration_minutes integer,
    status text DEFAULT 'pending', -- pending, approved, declined
    admin_note text,
    location_hint jsonb,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks_capec (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    volunteer_id uuid REFERENCES volunteers_capec(id) ON DELETE CASCADE,
    unique_code text NOT NULL,
    title text NOT NULL,
    description text,
    status text DEFAULT 'pending',
    admin_note text,
    created_at timestamptz DEFAULT now()
);

-- 4. CORE TABLES (ITECPEC)
CREATE TABLE IF NOT EXISTS volunteers_itecpec (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    phone text,
    email text,
    role text DEFAULT 'volunteer',
    unique_code text NOT NULL UNIQUE DEFAULT generate_unique_code(),
    active boolean DEFAULT true,
    profile_image_url text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance_itecpec (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    volunteer_id uuid REFERENCES volunteers_itecpec(id) ON DELETE CASCADE,
    unique_code text NOT NULL,
    device_id text,
    entry_time timestamptz NOT NULL,
    exit_time timestamptz,
    duration_minutes integer,
    status text DEFAULT 'pending',
    admin_note text,
    location_hint jsonb,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks_itecpec (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    volunteer_id uuid REFERENCES volunteers_itecpec(id) ON DELETE CASCADE,
    unique_code text NOT NULL,
    title text NOT NULL,
    description text,
    status text DEFAULT 'pending',
    admin_note text,
    created_at timestamptz DEFAULT now()
);

-- 5. AUDIT LOG (Unified Schema)
CREATE TABLE IF NOT EXISTS audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org text NOT NULL,        -- 'CAPEC' or 'ITECPEC'
    actor text,               -- Email or 'system'
    action text NOT NULL,     -- 'check-in', 'check-out', etc.
    target_type text,         -- 'attendance_itecpec', etc.
    target_id uuid,
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

-- 6. WHATSAPP ACTION LINK SYSTEM
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
    admin_pin text                            -- optional 4-digit PIN
);

CREATE TABLE IF NOT EXISTS notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    action_token_id uuid REFERENCES action_tokens(id),
    "to" text,                                
    message text,
    sent_at timestamptz,
    status text,                              -- 'pending', 'sent', 'failed'
    created_at timestamptz DEFAULT now()
);

-- 7. WHATSAPP SYSTEM FUNCTIONS
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
    p_action TEXT, -- 'approve' | 'decline'
    p_admin_notes TEXT DEFAULT ''
)
RETURNS VOID AS $$
DECLARE
    v_target_table TEXT;
    v_target_id UUID;
    v_token_id UUID;
BEGIN
    -- 1. Validate Token
    SELECT id, target_table, target_id INTO v_token_id, v_target_table, v_target_id
    FROM action_tokens
    WHERE token = p_token AND used = false AND expires_at > now();

    IF v_token_id IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired token';
    END IF;

    -- 2. Update Target Attendance/Task
    EXECUTE format('UPDATE %I SET status = %L, admin_note = %L WHERE id = %L', 
        v_target_table, 
        CASE WHEN p_action = 'approve' THEN 'approved' ELSE 'declined' END,
        p_admin_notes,
        v_target_id
    );

    -- 3. Mark Token as Used
    UPDATE action_tokens SET used = true, used_at = now() WHERE id = v_token_id;

END;
$$ LANGUAGE plpgsql;

-- 8. SECURITY (RLS)
ALTER TABLE volunteers_capec ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_capec ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks_capec ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteers_itecpec ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_itecpec ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks_itecpec ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Admins Read All Logs
DROP POLICY IF EXISTS "Admins Read All Logs" ON audit_log;
CREATE POLICY "Admins Read All Logs" ON audit_log FOR SELECT TO authenticated USING (true);

-- Admin Data Access (Generic - can be tightened as per specific user rules)
-- For now, allowing authenticated service roles (Edge Functions) and Admin users
CREATE POLICY "Service Role All Access" ON volunteers_capec FOR ALL TO service_role USING (true);
CREATE POLICY "Service Role All Access" ON attendance_capec FOR ALL TO service_role USING (true);
CREATE POLICY "Service Role All Access" ON audit_log FOR ALL TO service_role USING (true);

-- 9. REALTIME
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'audit_log') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE audit_log;
    END IF;
END $$;

COMMIT;
