import { createAdminClient, corsHeaders, logAudit } from "../_shared/utils.js";

Deno.serve(async (req: any) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { code: rawCode, title, description, category, time_spent_minutes, org: requestedOrg } = await req.json();
    if (!rawCode) throw new Error("Missing code");
    const code = rawCode.trim();
    console.log(`Log Task Request: [${code}] for Org: [${requestedOrg}]`);

    const supabase = createAdminClient();
    let resolvedOrg = requestedOrg;
    let suffix = requestedOrg?.toUpperCase() === 'ITECPEC' ? 'itecpec' : (requestedOrg?.toUpperCase() === 'CAPEC' ? 'capec' : null);

    const lookupVolunteer = async (s: string) => {
      console.log(`Searching volunteers_${s}...`);
      const { data: vol } = await supabase.from(`volunteers_${s}`).select('id').ilike('unique_code', code).single();
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

    if (!vol) throw new Error("Invalid Code");

    const { data: task, error } = await supabase
      .from(`tasks_${suffix}`)
      .insert({
        volunteer_id: vol.id,
        unique_code: code,
        title,
        description,
        category,
        duration_minutes: time_spent_minutes,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    await logAudit(supabase, resolvedOrg, 'volunteer', 'create_task', `tasks_${suffix}`, task.id, { title });

    return new Response(JSON.stringify({ success: true, data: task, resolved_org: resolvedOrg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
