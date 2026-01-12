import { createAdminClient, corsHeaders, logAudit } from "../_shared/utils.js";

// @ts-ignore
Deno.serve(async (req: any) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const { taskId, action, minutes, org } = await req.json();
        const suffix = org === 'ITECPEC' ? 'itecpec' : 'capec';

        if (!taskId || !action || !org) {
            throw new Error("Missing required fields (taskId, action, org)");
        }

        const supabase = createAdminClient();

        let updateData: any = {};
        let auditAction = "";

        if (action === 'accept') {
            updateData = { status: 'in_progress' };
            auditAction = 'accept_task';
        } else if (action === 'complete') {
            if (!minutes) throw new Error("Minutes spent is required for completion");
            updateData = {
                status: 'pending',
                duration_minutes: parseInt(minutes),
                completed_at: new Date().toISOString()
            };
            auditAction = 'submit_task';
        } else {
            throw new Error("Invalid action. Use 'accept' or 'complete'.");
        }

        const { data: task, error } = await supabase
            .from(`tasks_${suffix}`)
            .update(updateData)
            .eq('id', taskId)
            .select('*, volunteers_' + suffix + '(name, telegram_id)')
            .single();

        if (error) throw error;

        // Log Audit
        const volInfo = task[`volunteers_${suffix}`];
        const volName = volInfo?.name || 'Unknown';
        const volTelegramId = volInfo?.telegram_id;

        await logAudit(supabase, org, 'volunteer', auditAction, `tasks_${suffix}`, taskId, {
            title: task.title,
            volunteer: volName,
            minutes: minutes
        });

        // --- TELEGRAM NOTIFICATIONS ---
        const now = new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kathmandu' });
        const botUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/telegram-bot`;
        // @ts-ignore
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

        if (action === 'complete') {
            // 1. Admin Alert (Admin #3)
            const adminMsg = `📤 *Task Submitted for Review*\n\n👤 Volunteer: ${volName}\n📌 Task: ${task.title}\n🕒 Submitted at: ${now}\n\nAction required.`;

            try {
                await fetch(botUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}` },
                    body: JSON.stringify({ message: adminMsg })
                });
            } catch (err) {
                console.error("Admin Notify Error:", err);
            }

            // 2. Volunteer Confirmation (Volunteer #5)
            if (volTelegramId) {
                const volMsg = `📤 *Task Update Submitted*\n\n📌 Task: ${task.title}\n🕒 Submitted at: ${now}\n\nYour update is pending organizer approval.\nYou’ll be notified shortly.`;

                try {
                    await fetch(botUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}` },
                        body: JSON.stringify({ message: volMsg, chat_id: volTelegramId })
                    });
                } catch (err) {
                    console.error("Volunteer Notify Error:", err);
                }
            }
        }

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
