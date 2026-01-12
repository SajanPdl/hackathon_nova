import { createAdminClient, corsHeaders, logAudit } from "../_shared/utils.js";

Deno.serve(async (req: any) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code')?.trim();
    const org = url.searchParams.get('org');

    if (!code || !org) throw new Error("Missing code or org param");
    console.log(`Volunteer Lookup: [${code}] for Org: [${org}]`);

    const supabase = createAdminClient();
    let resolvedOrg = org;
    let suffix = org.toUpperCase() === 'ITECPEC' ? 'itecpec' : (org.toUpperCase() === 'CAPEC' ? 'capec' : null);

    const lookupVolunteerData = async (s: string) => {
      console.log(`Searching volunteers_${s}...`);
      const { data: vol } = await supabase.from(`volunteers_${s}`).select('*').ilike('unique_code', code).single();
      if (!vol) return null;

      const [attRes, tasksRes] = await Promise.all([
        supabase.from(`attendance_${s}`).select('*').eq('volunteer_id', vol.id).order('entry_time', { ascending: false }).limit(10),
        supabase.from(`tasks_${s}`).select('*').eq('volunteer_id', vol.id).order('created_at', { ascending: false }).limit(10)
      ]);

      return {
        volunteer: vol,
        attendance: attRes.data || [],
        tasks: tasksRes.data || []
      };
    };

    let result = await lookupVolunteerData(suffix || 'itecpec');
    if (!result && (!suffix || org.toUpperCase() === 'ITECPEC')) {
      // Try CAPEC if not already tried or if ITECPEC failed
      result = await lookupVolunteerData('capec');
      if (result) resolvedOrg = 'CAPEC';
    } else if (!result && org.toUpperCase() === 'CAPEC') {
      // Try ITECPEC if CAPEC failed
      result = await lookupVolunteerData('itecpec');
      if (result) resolvedOrg = 'ITECPEC';
    }

    if (!result) {
      console.log(`Volunteer not found: '${code}'`);
      throw new Error("Volunteer not found");
    }

    return new Response(JSON.stringify({
      success: true,
      data: result,
      resolved_org: resolvedOrg
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
