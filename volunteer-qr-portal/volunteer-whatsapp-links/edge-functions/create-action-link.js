import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createAdminClient, corsHeaders, formatKathmanduTime } from "./utils.js";

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { 
        target_table, 
        target_id, 
        action_type, 
        volunteer_name, 
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
    const actionBase = Deno.env.get('ACTION_LINK_BASE') || 'https://scan.yourdomain.com/admin-action/?t=';
    const actionLink = `${actionBase}${token}`;
    const timeFormatted = formatKathmanduTime(new Date().toISOString());

    // Prepare WhatsApp Message
    const actionLabel = action_type.replace(/_/g, ' ').toUpperCase();
    let message = `🔔 *Volunteer Alert*\n\n`;
    message += `*Name:* ${volunteer_name || 'N/A'}\n`;
    message += `*Org:* ${org || 'N/A'}\n`;
    message += `*Time:* ${timeFormatted}\n`;
    message += `*Action:* ${actionLabel}\n`;
    if (pin) message += `*PIN:* ${pin}\n`;
    message += `\n*Approve / Decline here:*\n${actionLink}`;

    const waLink = `https://wa.me/?text=${encodeURIComponent(message)}`;

    // 6. AUTOMATION: Send via SendZen WhatsApp API if configured
    const szApiKey = Deno.env.get('SENDZEN_API_KEY');
    const szFrom = Deno.env.get('SENDZEN_FROM_NUMBER') || '919099912730';
    let adminPhone = Deno.env.get(`NOTIFY_PHONE_${org}`) || Deno.env.get('NOTIFY_PHONE_DEFAULT');
    
    // Clean phone number (strip + and spaces for SendZen compatibility)
    if (adminPhone) {
      adminPhone = adminPhone.replace(/\+/g, '').replace(/\s/g, '');
    }

    let autoSendStatus = 'disabled';
    
    if (szApiKey && adminPhone) {
      try {
        const szUrl = `https://api.sendzen.io/v1/messages`;
        const szResponse = await fetch(szUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${szApiKey}`
          },
          body: JSON.stringify({
            from: szFrom,
            to: adminPhone,
            type: "text",
            text: {
              body: message
            }
          })
        });
        
        const szData = await szResponse.json();
        autoSendStatus = szResponse.ok ? 'success' : `error: ${JSON.stringify(szData)}`;
      } catch (err) {
        console.error("SendZen Automation failed:", err);
        autoSendStatus = `error: ${err.message}`;
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      token, 
      actionLink, 
      message,
      pin,
      autoSendStatus
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
