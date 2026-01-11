import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createAdminClient, corsHeaders, validateToken, formatKathmanduTime } from "./utils.js";

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('t');

    if (!token) throw new Error("Missing token");

    const supabase = createAdminClient();
    const { valid, data: tokenData, error: valError } = await validateToken(supabase, token);

    if (!valid) throw new Error(valError);

    // Fetch details of the target record to show on the action page
    // We assume target_table naming convention: 'attendance_itecpec' or 'attendance_capec'
    const suffix = tokenData.target_table.split('_')[1];
    
    let summary = {};
    if (tokenData.target_table.startsWith('attendance')) {
        const { data: attendance, error: attError } = await supabase
            .from(tokenData.target_table)
            .select(`
                id, 
                entry_time, 
                exit_time,
                volunteer:volunteers_${suffix}(name)
            `)
            .eq('id', tokenData.target_id)
            .single();
        
        if (!attError && attendance) {
            summary = {
                volunteer_name: attendance.volunteer.name,
                org: suffix.toUpperCase(),
                time: formatKathmanduTime(attendance.entry_time),
                event: attendance.exit_time ? 'Checkout' : 'Checkin'
            };
        }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      action_type: tokenData.action_type,
      target_summary: summary,
      payload: tokenData.payload,
      expires_at: tokenData.expires_at,
      require_pin: !!tokenData.admin_pin 
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
