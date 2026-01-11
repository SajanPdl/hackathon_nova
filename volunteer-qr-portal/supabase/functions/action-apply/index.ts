import { createAdminClient, corsHeaders, validateToken, logAudit, sendWhatsApp } from "../_shared/utils.js";

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const { token, action, pin, notes } = await req.json();
        if (!token || !action) throw new Error("Missing parameters");

        const supabase = createAdminClient();
        const { valid, data, error }: any = await validateToken(supabase, token);

        if (!valid) throw new Error(error);

        // Verify PIN if required
        if (data.admin_pin && data.admin_pin !== pin) {
            throw new Error("Invalid PIN");
        }

        // Apply the action using the RPC function
        const { error: applyError } = await supabase.rpc('apply_admin_action', {
            p_token: token,
            p_action: action,
            p_admin_notes: notes || ''
        });

        if (applyError) throw applyError;

        // Log the success
        const orgSuffix = data.target_table.split('_')[1];
        const org = orgSuffix.toUpperCase();
        await logAudit(supabase, org, 'System (Action Link)', `ADMIN_ACTION_${action.toUpperCase()}`, data.target_table, data.target_id, { notes });

        // NOTIFY VOLUNTEER
        try {
            // Get volunteer phone from the target record
            const { data: targetData } = await supabase
                .from(data.target_table)
                .select(`volunteer_id, volunteers_${orgSuffix}(name, phone)`)
                .eq('id', data.target_id)
                .single();

            const vol = targetData?.[`volunteers_${orgSuffix}`];
            if (vol?.phone) {
                const actionLabel = data.action_type.replace(/_/g, ' ').toUpperCase();
                const statusLabel = action === 'approve' ? '✅ APPROVED' : '❌ DECLINED';
                let volMsg = `👋 Hi ${vol.name || 'there'},\n\nYour *${actionLabel}* request has been *${statusLabel}* by the admin.`;
                if (notes) volMsg += `\n\n*Admin Note:* ${notes}`;

                await sendWhatsApp(vol.phone, volMsg);
            }
        } catch (notifErr) {
            console.error("Volunteer Action Notification Error:", notifErr);
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
        });
    }
});
