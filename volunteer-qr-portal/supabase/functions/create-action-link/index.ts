import { createAdminClient, corsHeaders, formatKathmanduTime, sendWhatsApp } from "../_shared/utils.js";

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const {
            target_table,
            target_id,
            action_type,
            volunteer_name,
            volunteer_phone,
            org,
            ttl_minutes = 30,
            require_pin = false
        } = await req.json();

        if (!target_table || !target_id || !action_type) {
            throw new Error("Missing required parameters");
        }

        const supabase = createAdminClient();

        // Generate pin if required
        const pin = require_pin ? Math.floor(1000 + Math.random() * 9000).toString() : null;

        // Call SQL function to create token
        const { data: tokenData, error: tokenError } = await supabase.rpc('create_action_token', {
            p_target_table: target_table,
            p_target_id: target_id,
            p_action_type: action_type,
            p_ttl_minutes: ttl_minutes,
            p_channel_hint: 'whatsapp',
            p_admin_pin: pin
        });

        if (tokenError || !tokenData) throw new Error(tokenError?.message || "Failed to create token");

        const token = tokenData[0].token;
        const actionBase = Deno.env.get(`ACTION_LINK_BASE_${org}`) || Deno.env.get('ACTION_LINK_BASE') || 'https://scan.yourdomain.com/admin-action/?t=';
        const actionLink = `${actionBase}${token}`;
        const timeFormatted = formatKathmanduTime(new Date().toISOString());

        // 1. NOTIFY ADMIN
        const actionLabel = action_type.replace(/_/g, ' ').toUpperCase();
        let adminMsg = `🔔 *Volunteer Alert*\n\n`;
        adminMsg += `*Name:* ${volunteer_name || 'N/A'}\n`;
        adminMsg += `*Org:* ${org || 'N/A'}\n`;
        adminMsg += `*Time:* ${timeFormatted}\n`;
        adminMsg += `*Action:* ${actionLabel}\n`;
        if (pin) adminMsg += `*PIN:* ${pin}\n`;
        adminMsg += `\n*Approve / Decline here:*\n${actionLink}`;

        const adminPhone = Deno.env.get(`NOTIFY_PHONE_${org}`) || Deno.env.get('NOTIFY_PHONE_DEFAULT');
        const adminNotif = await sendWhatsApp(adminPhone, adminMsg);

        // 2. NOTIFY VOLUNTEER (If phone provided)
        let volNotifStatus = 'skipped';
        if (volunteer_phone) {
            const volMsg = `👋 Hi ${volunteer_name || 'there'},\n\nYour *${actionLabel}* request has been received and is currently *PENDING* admin approval.\n\nWe will notify you here once it is reviewed!`;
            const volNotif = await sendWhatsApp(volunteer_phone, volMsg);
            volNotifStatus = volNotif.success ? 'success' : `error: ${volNotif.error}`;
        }

        return new Response(JSON.stringify({
            success: true,
            token,
            actionLink,
            adminNotifStatus: adminNotif.success ? 'success' : `error: ${adminNotif.error}`,
            volNotifStatus
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
        });
    }
});
