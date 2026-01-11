import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createAdminClient, corsHeaders, logAudit } from "./_shared/utils.js";

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { code, org } = await req.json();
    const suffix = org === 'ITECPEC' ? 'itecpec' : 'capec';

    const supabase = createAdminClient();

    const { data: vol } = await supabase.from(`volunteers_${suffix}`).select('id').eq('unique_code', code).single();
    if (!vol) throw new Error("Volunteer not found");

    const { data: session, error: findError } = await supabase
      .from(`attendance_${suffix}`)
      .select('id, entry_time')
      .eq('volunteer_id', vol.id)
      .is('exit_time', null)
      .order('entry_time', { ascending: false })
      .limit(1)
      .single();

    if (findError || !session) throw new Error("No active check-in found");

    const exitTime = new Date();
    const durationParam = Math.round((exitTime - new Date(session.entry_time)) / 60000);

    const { data: updated, error: updateError } = await supabase
      .from(`attendance_${suffix}`)
      .update({
        exit_time: exitTime.toISOString(),
        duration_minutes: durationParam,
        status: 'pending'
      })
      .eq('id', session.id)
      .select()
      .single();

    if (updateError) throw updateError;

    logAudit(supabase, org, 'system', 'checkout', `attendance_${suffix}`, session.id, { duration: durationParam });

    // --- INTEGRATION: Create Action Link for Admin (Checkout Approval) ---
    try {
      const EF_URL = Deno.env.get('SUPABASE_URL') + '/functions/v1/create-action-link';
      await fetch(EF_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({
          target_table: `attendance_${suffix}`,
          target_id: session.id,
          action_type: 'approve_attendance', // Or 'approve_checkout'
          volunteer_name: '', // We could fetch name if needed, but keeping it light
          org: org,
          require_pin: false
        })
      });
    } catch (err) {
      console.error("Action Link Integration Error:", err);
    }

    return new Response(JSON.stringify({ success: true, data: updated }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
