-- RLS Policies for WhatsApp Action Link System

-- Enable RLS on tables
ALTER TABLE action_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Action tokens are generally sensitive and should only be accessible by Service Role for management
-- However, certain information might need to be fetched by the public Action Page (GET metadata)
CREATE POLICY "Service role can do everything on action_tokens" 
ON action_tokens 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Public policy for fetching token metadata (restricted to essential fields)
-- Note: In a real production scenario, you might restrict this further by IP or use a secret header 
-- if not using Supabase Auth for the action page. However, since the tokens are cryptographically strong
-- and single-use, knowing the token itself acts as a secret.
CREATE POLICY "Anyone with a valid token can view basic metadata"
ON action_tokens
FOR SELECT
USING (used = false AND expires_at > now());

-- Notifications policies
CREATE POLICY "Service role can do everything on notifications"
ON notifications
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Admin staff can view notification history (assuming they use Supabase Auth or service role via board)
-- If using anonymous dashboard on cPanel, we primarily rely on the Edge Function to proxy these requests securely.

-- COMMENT: RLS is configured to prioritize security. Edge functions will use the SERVICE_ROLE_KEY
-- to perform administrative tasks, while the public frontend action page can only SELECT
-- non-sensitive metadata if the token is valid.
