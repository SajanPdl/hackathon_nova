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

export async function sendWhatsApp(to, message) {
  const szApiKey = Deno.env.get('SENDZEN_API_KEY');
  const szFrom = Deno.env.get('SENDZEN_FROM_NUMBER') || '919099912730';
  
  if (!szApiKey || !to) {
    console.warn("WhatsApp skip: Missing API Key or Phone number");
    return { success: false, error: "Missing config" };
  }

  // Clean phone number
  const cleanTo = to.replace(/\+/g, '').replace(/\s/g, '');

  try {
    const szUrl = `https://api.sendzen.io/v1/messages`;
    const response = await fetch(szUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${szApiKey}`
      },
      body: JSON.stringify({
        from: szFrom,
        to: cleanTo,
        type: "text",
        text: { body: message }
      })
    });
    
    const data = await response.json();
    return { success: response.ok, data };
  } catch (err) {
    console.error("Fetch Error:", err);
    return { success: false, error: err.message };
  }
}
