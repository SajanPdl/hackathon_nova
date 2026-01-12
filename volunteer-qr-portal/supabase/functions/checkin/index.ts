import { createAdminClient, corsHeaders, logAudit } from "../_shared/utils.js";

// @ts-ignore
Deno.serve(async (req: any) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { code: rawCode, device_id, org: requestedOrg } = await req.json();

    if (!rawCode) throw new Error("Missing code");
    const code = rawCode.trim();

    const supabase = createAdminClient();
    let resolvedOrg = requestedOrg;
    let suffix = requestedOrg === 'ITECPEC' ? 'itecpec' : (requestedOrg === 'CAPEC' ? 'capec' : null);

    let vol = null;
    let openSession = null;

    // Help function for lookup
    const lookupVolunteer = async (s: string) => {
      const [volRes, sessRes] = await Promise.all([
        supabase.from(`volunteers_${s}`).select('id, name, role').ilike('unique_code', code).single(),
        supabase.from(`attendance_${s}`).select('id').ilike('unique_code', code).is('exit_time', null)
          .maybeSingle()
      ]);
      return { vol: volRes.data, openSession: sessRes.data, error: volRes.error };
    };

    if (requestedOrg === 'BOTH' || !suffix) {
      // Try ITECPEC first
      const itec = await lookupVolunteer('itecpec');
      if (itec.vol) {
        vol = itec.vol;
        openSession = itec.openSession;
        resolvedOrg = 'ITECPEC';
        suffix = 'itecpec';
      } else {
        // Try CAPEC
        const capec = await lookupVolunteer('capec');
        if (capec.vol) {
          vol = capec.vol;
          openSession = capec.openSession;
          resolvedOrg = 'CAPEC';
          suffix = 'capec';
        }
      }
    } else {
      const result = await lookupVolunteer(suffix);
      vol = result.vol;
      openSession = result.openSession;
    }

    if (!vol) {
      console.log(`Checkin Failed: Code '${code}' not found in ${requestedOrg}.`);
      throw new Error(`Invalid Code: '${code}'`);
    }

    if (openSession) {
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

    // Send Telegram Notification (Async)
    const message = `✅ *Check-in Alert*\nVolunteer: *${vol.name}* (${vol.role})\nOrg: ${resolvedOrg}\nTime: ${new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kathmandu' })}`;

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
