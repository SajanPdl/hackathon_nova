import { createAdminClient, corsHeaders, logAudit } from "../_shared/utils.js";

// @ts-ignore
Deno.serve(async (req: any) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const { code, title, description, category, org } = await req.json();
        const suffix = org === 'ITECPEC' ? 'itecpec' : 'capec';

        if (!code || !org || !title) throw new Error("Missing required fields (code, org, title)");

        const supabase = createAdminClient();

        // 1. Lookup volunteer
        const { data: vol } = await supabase.from(`volunteers_${suffix}`).select('id, name').eq('unique_code', code).single();
        if (!vol) throw new Error("Invalid Volunteer Code");

        // 2. Insert assigned task
        const { data: task, error } = await supabase
            .from(`tasks_${suffix}`)
            .insert({
                volunteer_id: vol.id,
                unique_code: code,
                title,
                description,
                category: category || 'general',
                status: 'assigned', // Marked as assigned by admin
                duration_minutes: 0 // Initial assignment has no duration
            })
            .select()
            .single();

        if (error) throw error;

        // 3. Send Telegram Notification (Async)
        const message = `📋 *New Task Assigned*\nVolunteer: *${vol.name}*\nTask: ${title}\nOrg: ${org}\nTime: ${new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kathmandu' })}`;

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

        // 4. Log Audit
        await logAudit(supabase, org, 'admin', 'assign_task', `tasks_${suffix}`, task.id, { title, volunteer: vol.name });

        return new Response(JSON.stringify({ success: true, data: task }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
        });
    }
});
