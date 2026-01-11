import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, device-api-key',
}

export function createAdminClient(req) {
  const options = {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  };
  if (req) {
    options.global = {
      headers: { Authorization: req.headers.get('Authorization') }
    };
  }
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    options
  )
}

export function createAnonClient(req) {
  const options = {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  };
  if (req) {
    options.global = {
      headers: { Authorization: req.headers.get('Authorization') }
    };
  }
    return createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        options
      )
}

export async function logAudit(supabase, org, actor, action, target_type, target_id, payload) {
    const { error } = await supabase.from('audit_log').insert({
        org: org || 'SYSTEM',
        actor,
        action,
        target_type,
        target_id,
        details: payload || {}
    });
    if (error) {
        throw new Error(`AUDIT LOG FAILURE: ${error.message}. Action: ${action}, Org: ${org}`);
    }
}
