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

    await logAudit(supabase, resolvedOrg, 'volunteer', 'create_task', `tasks_${suffix}`, task.id, { title, volunteer: vol.name });

    // --- TELEGRAM NOTIFICATIONS ---
    const now = new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kathmandu' });
    const botUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/telegram-bot`;
    // @ts-ignore
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    // 1. Admin Alert (Admin #4)
    const adminMsg = `📝 *New Activity Logged*\n\n👤 Volunteer: ${vol.name}\n📌 Task: ${title}\n⏳ Duration: ${time_spent_minutes} mins\n🕒 Logged at: ${now}\n\nPending approval.`;

    try {
      await fetch(botUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}` },
        body: JSON.stringify({ message: adminMsg })
      });
    } catch (err) {
      console.error("Admin Task Notify Error:", err);
    }

    // 2. Volunteer Confirmation (Volunteer #3)
    if (vol.telegram_id) {
      const volMsg = `✅ *Activity Logged Successfully*\n\n📌 Task: ${title}\n⏳ Duration: ${time_spent_minutes} mins\n🕒 Logged at: ${now}\n\nYour activity has been sent for organizer approval.`;

      try {
        await fetch(botUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}` },
          body: JSON.stringify({ message: volMsg, chat_id: vol.telegram_id })
        });
      } catch (err) {
        console.error("Volunteer Task Notify Error:", err);
      }
    }

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
