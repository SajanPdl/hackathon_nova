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

        // 3. --- TELEGRAM NOTIFICATIONS ---
        const botUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/telegram-bot`;
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

        // 1. Admin Alert (Admin #6)
        const adminMsg = `🛠 *Task Assigned*\n\n👤 Volunteer: ${vol.name}\n📌 Task: ${title}\n⏱ Priority: High\n\nAssignment sent successfully.`;

        // @ts-ignore
        fetch(botUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}` },
            body: JSON.stringify({ message: adminMsg })
        }).catch(err => console.error("Admin Notify Error:", err));

        // 2. Volunteer Confirmation (Volunteer #4)
        if (vol.telegram_id) {
            const volMsg = `🆕 *New Task Assigned*\n\n📌 Task: ${title}\n🧭 Category: ${category || 'General'}\n⏱ Priority: High\n\n📝 Details:\n${description || 'No additional details.'}\n\nPlease complete and update once done.`;

            // @ts-ignore
            fetch(botUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}` },
                body: JSON.stringify({ message: volMsg, chat_id: vol.telegram_id })
            }).catch(err => console.error("Volunteer Notify Error:", err));
        }

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
