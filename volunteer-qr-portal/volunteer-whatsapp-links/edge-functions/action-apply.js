import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createAdminClient, corsHeaders, validateToken, logAudit } from "./utils.js";

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { token, action, admin_note, pin } = await req.json();

    if (!token || !action) throw new Error("Missing token or action");

    const supabase = createAdminClient();
    const { valid, data: tokenData, error: valError } = await validateToken(supabase, token);

    if (!valid) throw new Error(valError);

    // Verify PIN if required
    if (tokenData.admin_pin && tokenData.admin_pin !== pin) {
        throw new Error("Invalid PIN");
    }

    // Process action
    const { error: updateError } = await supabase.rpc('apply_admin_action', {
        p_token_id: tokenData.id,
        p_target_table: tokenData.target_table,
        p_target_id: tokenData.target_id,
        p_action: action, // 'approve', 'decline', 'assign'
        p_admin_note: admin_note || ''
    });

    // Note: 'apply_admin_action' needs to be defined in SQL to handle transaction
    // If not defined, we'll implement the logic here using standard Supabase calls
    // but a stored procedure is safer for atomicity.

    if (updateError) {
        // Fallback or explicit error handling
        console.error("Action apply error:", updateError);
        throw new Error(updateError.message || "Failed to apply action");
    }

    // Mark token as used
    await supabase.from('action_tokens').update({
        used: true,
        used_at: new Date().toISOString()
    }).eq('id', tokenData.id);

    logAudit(supabase, 'SYSTEM', 'admin', `action_${action}`, tokenData.target_table, tokenData.target_id, {
        note: admin_note,
        token_id: tokenData.id
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Action '${action}' applied successfully.`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
