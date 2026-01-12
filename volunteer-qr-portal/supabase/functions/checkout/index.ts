import { createAdminClient, corsHeaders, logAudit } from "../_shared/utils.js";

// @ts-ignore
Deno.serve(async (req: any) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { code, org } = await req.json();
    const suffix = org === 'ITECPEC' ? 'itecpec' : 'capec';

    const supabase = createAdminClient();

    const { data: vol } = await supabase.from(`volunteers_${suffix}`).select('id, name').eq('unique_code', code).single();
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

    // Send Telegram Notification (Async)
    const message = `👋 *Checkout Alert*\nVolunteer: *${vol.name}*\nOrg: ${org}\nDuration: ${durationParam} mins\nTime: ${new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kathmandu' })}`;

    // @ts-ignore
    fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/telegram-bot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // @ts-ignore
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
      },
      body: JSON.stringify({ message })
    }).catch(err => console.error("Telegram Error:", err));

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
