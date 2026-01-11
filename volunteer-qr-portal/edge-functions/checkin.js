import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createAdminClient, corsHeaders, logAudit } from "./_shared/utils.js";

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { code, device_id, org } = await req.json();
    const suffix = org === 'ITECPEC' ? 'itecpec' : 'capec';
    
    if (!code) throw new Error("Missing code");

    const supabase = createAdminClient();

    const { data: vol, error: volError } = await supabase
      .from(`volunteers_${suffix}`)
      .select('id, name')
      .eq('unique_code', code)
      .single();

    if (volError || !vol) throw new Error("Invalid Volunteer Code");

    const { data: openSession } = await supabase
      .from(`attendance_${suffix}`)
      .select('id')
      .eq('volunteer_id', vol.id)
      .is('exit_time', null)
      .single();

    if (openSession) {
      return new Response(JSON.stringify({ success: false, error: 'Already checked in' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: newSession, error: checkinError } = await supabase
      .from(`attendance_${suffix}`)
      .insert({
        volunteer_id: vol.id,
        unique_code: code,
        device_id: device_id || 'manual',
        entry_time: new Date().toISOString(),
        status: 'pending'
      })
      .select()
      .single();

    if (checkinError) throw checkinError;

    logAudit(supabase, org, 'system', 'checkin', `attendance_${suffix}`, newSession.id, { code });

    return new Response(JSON.stringify({ success: true, data: newSession }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
