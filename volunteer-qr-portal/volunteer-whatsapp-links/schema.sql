-- Database Schema for WhatsApp Action Link System

-- Extension for crypto functions if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table for tracking single-use action tokens
CREATE TABLE IF NOT EXISTS action_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT UNIQUE NOT NULL,
    action_type TEXT NOT NULL,                -- 'approve_attendance' | 'decline_attendance' | 'assign_task'
    target_table TEXT NOT NULL,               -- 'attendance_itecpec' | 'attendance_capec' | 'tasks'
    target_id uuid NOT NULL,
    payload jsonb DEFAULT '{}',               -- optional extra data (e.g., suggested task)
    created_at timestamptz DEFAULT now(),
    expires_at timestamptz NOT NULL,
    used boolean DEFAULT false,
    used_at timestamptz,
    created_by text,                          -- e.g., 'system', 'admin_user'
    created_by_id text,
    channel_hint text,                        -- e.g., 'whatsapp'
    ip_log jsonb DEFAULT '[]',                -- array of {ip, ua, ts}
    admin_pin text                            -- optional 4-digit PIN for verification
);

-- Table for notification history (displayed in admin dashboard)
CREATE TABLE IF NOT EXISTS notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    action_token_id uuid REFERENCES action_tokens(id),
    "to" text,                                -- recipient info or group identifier
    message text,
    sent_at timestamptz,
    status text,                              -- 'pending', 'sent', 'failed'
    created_at timestamptz DEFAULT now()
);

-- Function to create a secure action token
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
    -- Generate a cryptographically strong token (base64url format for link safety)
    v_token := encode(gen_random_bytes(32), 'base64');
    -- Make it URL safe (replace characters according to base64url standard)
    v_token := replace(replace(replace(v_token, '+', '-'), '/', '_'), '=', '');
    
    v_expires_at := now() + (p_ttl_minutes * interval '1 minute');

    INSERT INTO action_tokens (
        token, 
        action_type, 
        target_table, 
        target_id, 
        payload, 
        expires_at, 
        channel_hint,
        admin_pin,
        created_by
    ) VALUES (
        v_token, 
        p_action_type, 
        p_target_table, 
        p_target_id, 
        p_payload, 
        v_expires_at, 
        p_channel_hint,
        p_admin_pin,
        'system'
    );

    RETURN QUERY SELECT v_token, v_expires_at;
END;
$$ LANGUAGE plpgsql;

-- Sample seed data (Optional: for testing purposes)
-- Function to apply admin action atomically
CREATE OR REPLACE FUNCTION apply_admin_action(
    p_token_id UUID,
    p_target_table TEXT,
    p_target_id UUID,
    p_action TEXT,
    p_admin_note TEXT
)
RETURNS VOID AS $$
BEGIN
    -- Update the target table based on the action
    IF p_target_table = 'attendance_itecpec' THEN
        IF p_action = 'approve' THEN
            UPDATE attendance_itecpec SET status = 'approved', admin_note = p_admin_note WHERE id = p_target_id;
        ELSIF p_action = 'decline' THEN
            UPDATE attendance_itecpec SET status = 'declined', admin_note = p_admin_note WHERE id = p_target_id;
        END IF;
    ELSIF p_target_table = 'attendance_capec' THEN
        IF p_action = 'approve' THEN
            UPDATE attendance_capec SET status = 'approved', admin_note = p_admin_note WHERE id = p_target_id;
        ELSIF p_action = 'decline' THEN
            UPDATE attendance_capec SET status = 'declined', admin_note = p_admin_note WHERE id = p_target_id;
        END IF;
    END IF;

    -- If the action is 'assign', we might insert into a tasks table (logic can be expanded here)
    IF p_action = 'assign' THEN
        -- Example: INSERT INTO tasks (target_id, note) VALUES (p_target_id, p_admin_note);
    END IF;

END;
$$ LANGUAGE plpgsql;
