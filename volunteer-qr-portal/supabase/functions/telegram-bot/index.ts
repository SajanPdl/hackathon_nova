import { createAdminClient, corsHeaders } from "../_shared/utils.js";

// @ts-ignore
Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    const supabase = createAdminClient();

    if (req.method === 'GET') {
        const url = new URL(req.url);
        if (url.pathname.endsWith('/debug-data')) {
            const { data: itec } = await supabase.from('volunteers_itecpec').select('name, unique_code');
            const { data: capec } = await supabase.from('volunteers_capec').select('name, unique_code');
            return new Response(JSON.stringify({ itec, capec }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        return new Response('Telegram Bot Edge Function is Live ??', {
            headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
        });
    }

    try {
        const payload = await req.json();

        // --- LOG TO DATABASE FOR DEBUGGING ---
        await supabase.from('debug_logs').insert({
            source: 'telegram-bot-webhook',
            payload
        });

        const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
        const adminChatId = Deno.env.get('TELEGRAM_CHAT_ID');

        if (!botToken) {
            console.error("CRITICAL: TELEGRAM_BOT_TOKEN missing");
            await supabase.from('debug_logs').insert({ source: 'error', payload: { error: 'TELEGRAM_BOT_TOKEN missing' } });
            throw new Error("TELEGRAM_BOT_TOKEN is not set");
        }

        // --- CASE 1: INTERNAL MESSAGE REQUEST ---
        if (typeof payload.message === 'string') {
            const { message, chat_id } = payload;
            const targetChatId = chat_id || adminChatId;

            console.log(`Sending internal message to ${targetChatId}`);
            const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: targetChatId,
                    text: message,
                    parse_mode: 'Markdown'
                })
            });

            const data = await res.json();
            await supabase.from('debug_logs').insert({ source: 'telegram-out-internal', payload: { targetChatId, data } });

            return new Response(JSON.stringify({ success: res.ok, telegram_response: data }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // --- CASE 2: INCOMING WEBHOOK (from Telegram) ---
        if (payload.message && typeof payload.message === 'object' && payload.message.text) {
            const { text, chat: { id: chatId } } = payload.message;

            // Handle /id command to help user find group ID
            if (text.startsWith('/id')) {
                return sendTelegramMessage(botToken, chatId, `🆔 Your Chat ID is: \`${chatId}\``, supabase);
            }

            // Handle /start [code]
            if (text.startsWith('/start')) {
                const parts = text.split(' ');
                const rawCode = parts.length > 1 ? parts[1] : null;
                const code = rawCode ? rawCode.trim().toUpperCase() : null;

                if (!code) {
                    return sendTelegramMessage(botToken, chatId, "👋 *Welcome to Hackathon Nova!*\n\nPlease use the 'Start Bot' button in your volunteer portal to link your account so we can send you notifications.", supabase);
                }

                // Lookup volunteer in both orgs
                let vol = null;
                let org = '';

                // Try ITECPEC (Case insensitive)
                const itecRes = await supabase.from('volunteers_itecpec').select('id, name').ilike('unique_code', code).single();
                if (itecRes.data) {
                    vol = itecRes.data;
                    org = 'ITECPEC';
                } else {
                    // Try CAPEC (Case insensitive)
                    const capecRes = await supabase.from('volunteers_capec').select('id, name').ilike('unique_code', code).single();
                    if (capecRes.data) {
                        vol = capecRes.data;
                        org = 'CAPEC';
                    }
                }

                if (!vol) {
                    console.log(`Registration lookup failed for code: [${code}]`);
                    await supabase.from('debug_logs').insert({ source: 'registration-failed', payload: { code, message: 'Volunteer not found' } });
                    return sendTelegramMessage(botToken, chatId, `❌ *Invalid registration code: [${code}]*\n\nPlease ensure you clicked the link directly from your volunteer portal.`, supabase);
                }

                // Link the telegram_id
                const table = org === 'ITECPEC' ? 'volunteers_itecpec' : 'volunteers_capec';
                const { error: updateErr } = await supabase.from(table).update({ telegram_id: chatId }).eq('id', vol.id);

                if (updateErr) {
                    await supabase.from('debug_logs').insert({ source: 'db-update-error', payload: { error: updateErr } });
                    throw updateErr;
                }

                await supabase.from('debug_logs').insert({ source: 'registration-success', payload: { volunteer: vol.name, org } });

                const welcomeMsg = `👋 *Welcome to Hackathon Nova!*

You’re now connected to the official volunteer system, *${vol.name}*.

You will receive:
• Check-in & check-out confirmations
• Task assignments
• Approval / rejection updates
• Important event alerts

🔔 Keep Telegram notifications ON during the event.
Let’s make this hackathon smooth and impactful 🚀`;

                return sendTelegramMessage(botToken, chatId, welcomeMsg, supabase);
            }
        }

        return new Response(JSON.stringify({ success: true, message: "No action performed" }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error("TELEGRAM BOT ERROR:", error.message);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
        });
    }
});

async function sendTelegramMessage(botToken: string, chatId: number | string, text: string, supabase: any) {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown'
        })
    });
    const data = await res.json();
    if (supabase) {
        await supabase.from('debug_logs').insert({ source: 'telegram-out-webhook', payload: { chatId, data } });
    }
    return new Response(JSON.stringify({ success: res.ok, telegram_response: data }), {
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
    });
}
