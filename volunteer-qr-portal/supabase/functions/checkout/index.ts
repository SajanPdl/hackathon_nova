import { createAdminClient, corsHeaders, logAudit } from "../_shared/utils.js";

Deno.serve(async (req: any) => {
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
    const durationParam = Math.round((exitTime.getTime() - new Date(session.entry_time).getTime()) / 60000);

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

    await logAudit(supabase, org, 'system', 'check-out', `attendance_${suffix}`, session.id, { duration: durationParam });

    // TRIGGER: Create Action Link for WhatsApp/SendZen Notification
    try {
      // Get volunteer name and phone for the notification
      const { data: volData } = await supabase
        .from(`volunteers_${suffix}`)
        .select('name, phone')
        .eq('id', vol.id)
        .single();

      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/create-action-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({
          target_table: `attendance_${suffix}`,
          target_id: session.id,
          action_type: 'approve_attendance_checkout',
          volunteer_name: volData?.name || 'Volunteer',
          volunteer_phone: volData?.phone,
          org: org,
          require_pin: false
        })
      });
    } catch (triggerErr) {
      console.error("Action Link Trigger Error:", triggerErr);
    }

    return new Response(JSON.stringify({ success: true, data: updated }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
