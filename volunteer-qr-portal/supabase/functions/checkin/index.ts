import { createAdminClient, corsHeaders, logAudit } from "../_shared/utils.js";

Deno.serve(async (req: any) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { code: rawCode, device_id, org } = await req.json();
    const suffix = org === 'ITECPEC' ? 'itecpec' : 'capec';

    if (!rawCode) throw new Error("Missing code");
    const code = rawCode.trim();

    const supabase = createAdminClient();

    const [volResult, sessionResult] = await Promise.all([
      supabase
        .from(`volunteers_${suffix}`)
        .select('id, name, role')
        .eq('unique_code', code)
        .single(),
      supabase
        .from(`attendance_${suffix}`)
        .select('id')
        .eq('unique_code', code)
        .is('exit_time', null)
        .maybeSingle()
    ]);

    const { data: vol, error: volError } = volResult;
    const { data: openSession } = sessionResult;

    if (volError || !vol) {
      console.log(`Checkin Failed: Code '${code}' not found.`);
      throw new Error(`Invalid Code: '${code}'`);
    }

    if (openSession) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Already checked in',
        participant: vol
      }), {
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

    await logAudit(supabase, org, 'system', 'check-in', `attendance_${suffix}`, newSession.id, { code });

    // TRIGGER: Create Action Link for WhatsApp/SendZen Notification
    try {
      // Fetch phone number for notification
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
          target_id: newSession.id,
          action_type: 'approve_attendance',
          volunteer_name: volData?.name || vol.name,
          volunteer_phone: volData?.phone,
          org: org,
          require_pin: false
        })
      });
    } catch (triggerErr) {
      console.error("Action Link Trigger Error:", triggerErr);
    }

    return new Response(JSON.stringify({
      success: true,
      data: newSession,
      participant: vol
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message || 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
