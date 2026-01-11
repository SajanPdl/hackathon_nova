import { createAdminClient, corsHeaders, logAudit } from "../_shared/utils.js";

Deno.serve(async (req: any) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { code: rawCode, device_id, org } = await req.json();
    const suffix = org === 'ITECPEC' ? 'itecpec' : 'capec';

    if (!rawCode) throw new Error("Missing code");
    const code = rawCode.trim();

    const supabase = createAdminClient();

    // Parallelize Volunteer Lookup and Open Session Check
    const [volResult, sessionResult] = await Promise.all([
      supabase
        .from(`volunteers_${suffix}`)
        .select('id, name')
        .eq('unique_code', code)
        .single(),
      supabase
        .from(`attendance_${suffix}`)
        .select('id')
        .eq('unique_code', code) // Use code for faster lookup if possible, or vol.id later. 
        .is('exit_time', null)
        .maybeSingle() // Use maybeSingle to avoid 406 errors on empty results
    ]);

    const { data: vol, error: volError } = volResult;
    const { data: openSession } = sessionResult;

    if (volError || !vol) {
      // (Error handling remains the same for robustness)
      console.log(`Checkin Failed: Code '${code}' not found.`);
      throw new Error(`Invalid Code: '${code}'`);
    }

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

    await logAudit(supabase, org, 'system', 'check-in', `attendance_${suffix}`, newSession.id, { code });

    return new Response(JSON.stringify({ success: true, data: newSession }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message || 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
