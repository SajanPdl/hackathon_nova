import { createAdminClient, corsHeaders, logAudit } from "../_shared/utils.js";

// @ts-ignore
Deno.serve(async (req: any) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { code: rawCode, org: requestedOrg } = await req.json();
    if (!rawCode) throw new Error("Missing code");
    const code = rawCode.trim();
    console.log(`Checkout Request: [${code}] for Org: [${requestedOrg}]`);

    const supabase = createAdminClient();
    let resolvedOrg = requestedOrg;
    let suffix = requestedOrg?.toUpperCase() === 'ITECPEC' ? 'itecpec' : (requestedOrg?.toUpperCase() === 'CAPEC' ? 'capec' : null);

    const lookupVolunteer = async (s: string) => {
      console.log(`Searching volunteers_${s}...`);
      const { data: vol } = await supabase.from(`volunteers_${s}`).select('id, name, telegram_id').ilike('unique_code', code).single();
      return vol;
    };

    let vol = await lookupVolunteer(suffix || 'itecpec');
    if (!vol && (!suffix || requestedOrg?.toUpperCase() === 'ITECPEC')) {
      vol = await lookupVolunteer('capec');
      if (vol) {
        resolvedOrg = 'CAPEC';
        suffix = 'capec';
      }
    } else if (!vol && requestedOrg?.toUpperCase() === 'CAPEC') {
      vol = await lookupVolunteer('itecpec');
      if (vol) {
        resolvedOrg = 'ITECPEC';
        suffix = 'itecpec';
      }
    }

    if (!vol) throw new Error("Volunteer not found");
    console.log(`Checking out ${vol.name} from ${resolvedOrg}`);

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

    await logAudit(supabase, resolvedOrg, 'system', 'check-out', `attendance_${suffix}`, session.id, { duration: durationParam });

    // --- TELEGRAM NOTIFICATIONS ---
    const now = new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kathmandu' });
    const botUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/telegram-bot`;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    // 1. Admin Alert
    const adminMsg = `🔵 *Volunteer Check-Out*\n\n👤 Name: ${vol.name}\n🪪 Code: ${code}\n🕒 Time: ${now}\n\nExit approval required.`;

    // @ts-ignore
    fetch(botUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}` },
      body: JSON.stringify({ message: adminMsg })
    }).catch(err => console.error("Admin Notify Error:", err));

    // 2. Volunteer Confirmation
    if (vol.telegram_id) {
      const volMsg = `👋 *Check-Out Recorded*\n\n🕒 Time: ${now}\n\nThank you for your contribution today.\nPlease ensure all assigned tasks are updated.`;

      // @ts-ignore
      fetch(botUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}` },
        body: JSON.stringify({ message: volMsg, chat_id: vol.telegram_id })
      }).catch(err => console.error("Volunteer Notify Error:", err));
    }

    return new Response(JSON.stringify({ success: true, data: updated, resolved_org: resolvedOrg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
