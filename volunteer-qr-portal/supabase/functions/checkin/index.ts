import { createAdminClient, corsHeaders, logAudit } from "../_shared/utils.js";

// @ts-ignore
Deno.serve(async (req: any) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { code: rawCode, device_id, org: requestedOrg } = await req.json();
    console.log(`Checkin Request: [${rawCode}] for Org: [${requestedOrg}]`);

    if (!rawCode) throw new Error("Missing code");
    const code = rawCode.trim();

    const supabase = createAdminClient();
    let resolvedOrg = null;
    let suffix = requestedOrg?.toUpperCase() === 'ITECPEC' ? 'itecpec' : (requestedOrg?.toUpperCase() === 'CAPEC' ? 'capec' : null);

    let vol = null;
    let openSession = null;
    let isWrongOrg = false;

    // Help function for lookup
    const lookupVolunteer = async (s: string) => {
      console.log(`Looking up '${code}' in volunteers_${s}...`);
      const [volRes, sessRes] = await Promise.all([
        supabase.from(`volunteers_${s}`).select('id, name, role, telegram_id').ilike('unique_code', code).single(),
        supabase.from(`attendance_${s}`).select('id').ilike('unique_code', code).is('exit_time', null)
          .maybeSingle()
      ]);
      return { vol: volRes.data, openSession: sessRes.data, error: volRes.error };
    };

    if (requestedOrg?.toUpperCase() === 'BOTH' || !suffix) {
      console.log("Universal lookup triggered...");
      const itec = await lookupVolunteer('itecpec');
      if (itec.vol) {
        console.log("Found in ITECPEC");
        vol = itec.vol;
        openSession = itec.openSession;
        resolvedOrg = 'ITECPEC';
        suffix = 'itecpec';
      } else {
        const capec = await lookupVolunteer('capec');
        if (capec.vol) {
          console.log("Found in CAPEC");
          vol = capec.vol;
          openSession = capec.openSession;
          resolvedOrg = 'CAPEC';
          suffix = 'capec';
        }
      }
    } else {
      resolvedOrg = requestedOrg.toUpperCase();
      const result = await lookupVolunteer(suffix);
      vol = result.vol;
      openSession = result.openSession;

      // If not found in requested org, try the other one to be helpful
      if (!vol) {
        console.log(`Not found in ${resolvedOrg}, checking the other org...`);
        const otherSuffix = suffix === 'itecpec' ? 'capec' : 'itecpec';
        const otherOrg = resolvedOrg === 'ITECPEC' ? 'CAPEC' : 'ITECPEC';
        const otherResult = await lookupVolunteer(otherSuffix);
        if (otherResult.vol) {
          console.log(`Found in ${otherOrg} instead!`);
          return new Response(JSON.stringify({
            success: false,
            error: 'Wrong organization portal',
            message: `This code belongs to ${otherOrg}. Redirecting...`,
            resolved_org: otherOrg
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          });
        }
      }
    }

    if (!vol) {
      console.log(`Checkin Failed: Code '${code}' not found in any org.`);
      throw new Error(`Invalid Code: '${code}'`);
    }

    if (openSession) {
      console.log(`Volunteer ${vol.name} already checked in. Returning existing session.`);
      return new Response(JSON.stringify({
        success: false,
        error: 'Already checked in',
        participant: vol,
        resolved_org: resolvedOrg
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

    // --- TELEGRAM NOTIFICATIONS ---
    const now = new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kathmandu' });
    const botUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/telegram-bot`;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    // 1. Admin Alert (Admin #1)
    const adminMsg = `🟢 *Volunteer Check-In*\n\n👤 Name: ${vol.name}\n🪪 Code: ${code}\n🕒 Time: ${now}\n📍 Entry: Hackathon Portal\n\nStatus: Pending approval`;

    try {
      const adminRes = await fetch(botUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}` },
        body: JSON.stringify({ message: adminMsg })
      });
      console.log("Admin Notify status:", adminRes.status);
    } catch (err) {
      console.error("Admin Notify Error:", err);
    }

    // 2. Volunteer Confirmation (Volunteer #2)
    if (vol.telegram_id) {
      const volMsg = `✅ *Check-In Successful*\n\n🕒 Time: ${now}\n📍 Venue: Hackathon Nova\n🪪 Volunteer ID: ${code}\n\nYour entry has been recorded.\nHave a productive session 🚀`;

      try {
        const volRes = await fetch(botUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}` },
          body: JSON.stringify({ message: volMsg, chat_id: vol.telegram_id })
        });
        console.log("Volunteer Notify status:", volRes.status);
      } catch (err) {
        console.error("Volunteer Notify Error:", err);
      }
    }

    await logAudit(supabase, resolvedOrg, 'system', 'check-in', `attendance_${suffix}`, newSession.id, { code });

    return new Response(JSON.stringify({
      success: true,
      data: newSession,
      participant: vol,
      resolved_org: resolvedOrg
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
