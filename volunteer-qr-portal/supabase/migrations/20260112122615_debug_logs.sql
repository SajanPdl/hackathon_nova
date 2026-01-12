CREATE TABLE IF NOT EXISTS debug_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    source text,
    payload jsonb
);

ALTER TABLE debug_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON debug_logs FOR ALL USING (true);
