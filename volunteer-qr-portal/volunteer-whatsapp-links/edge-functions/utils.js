import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function createAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      auth: {
        persistSession: false,
      },
    }
  );
}

export async function logAudit(supabase, org, user, action, table, target_id, details) {
  const { error } = await supabase
    .from('audit_logs') // Assuming existing audit_logs table
    .insert({
      org,
      user_id: user,
      action,
      target_table: table,
      target_id,
      details,
      created_at: new Date().toISOString(),
    });
  if (error) console.error('Audit Log Error:', error);
}

export function formatKathmanduTime(dateString) {
  const date = dateString ? new Date(dateString) : new Date();
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kathmandu',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export async function validateToken(supabase, token) {
  const { data, error } = await supabase
    .from('action_tokens')
    .select('*')
    .eq('token', token)
    .single();

  if (error || !data) return { valid: false, error: 'Invalid token' };
  if (data.used) return { valid: false, error: 'Token already used' };
  if (new Date(data.expires_at) < new Date()) return { valid: false, error: 'Token expired' };

  return { valid: true, data };
}
