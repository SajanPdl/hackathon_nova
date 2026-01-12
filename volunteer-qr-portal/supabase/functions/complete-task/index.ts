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
            .select('*, volunteers_' + suffix + '(name)')
            .single();

        if (error) throw error;

        // Log Audit
        const volName = task[`volunteers_${suffix}`]?.name || 'Unknown';
        await logAudit(supabase, org, 'volunteer', auditAction, `tasks_${suffix}`, taskId, {
            title: task.title,
            volunteer: volName,
            minutes: minutes
        });

        // Notify Admin via Telegram if completed
        if (action === 'complete') {
            const message = `🛠️ *Task Submitted*
Volunteer: *${volName}*
Task: ${task.title}
Duration: ${minutes} mins
Org: ${org}
Status: Pending Approval`;

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
