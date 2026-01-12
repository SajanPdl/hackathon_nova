import { createAdminClient, corsHeaders } from "../_shared/utils.js";

// @ts-ignore
Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const payload = await req.json();
        const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
        const adminChatId = Deno.env.get('TELEGRAM_CHAT_ID');

        if (!botToken || !adminChatId) {
            throw new Error('Telegram configuration missing');
        }

        // 1. Handle Outgoing Message (Internal Service Call)
        if (payload.message) {
            const { message, chat_id } = payload;
            const targetChatId = chat_id || adminChatId;

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
            return new Response(JSON.stringify(data), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 2. Handle Incoming Webhook (from Telegram)
        if (payload.message && payload.message.text) {
            const { text, chat: { id: chatId } } = payload.message;
            const supabase = createAdminClient();

            // Check for /start [code]
            if (text.startsWith('/start')) {
                const code = text.split(' ')[1];
                if (!code) {
                    return sendTelegramMessage(botToken, chatId, "👋 Welcome! Please use the 'Start Bot' button in your volunteer portal to link your account.");
                }

                // Try lookup in both orgs
                let vol = null;
                let org = '';

                const itecRes = await supabase.from('volunteers_itecpec').select('id, name').eq('unique_code', code).single();
                if (itecRes.data) { vol = itecRes.data; org = 'ITECPEC'; }
                else {
                    const capecRes = await supabase.from('volunteers_capec').select('id, name').eq('unique_code', code).single();
                    if (capecRes.data) { vol = capecRes.data; org = 'CAPEC'; }
                }

                if (!vol) {
                    return sendTelegramMessage(botToken, chatId, "❌ Invalid registration code. Please check your portal.");
                }

                // Update volunteer with telegram_id
                const table = org === 'ITECPEC' ? 'volunteers_itecpec' : 'volunteers_capec';
                await supabase.from(table).update({ telegram_id: chatId }).eq('id', vol.id);

                // Send Welcome Message (Message Library #1)
                const welcomeMsg = `👋 *Welcome to Hackathon Nova!*

You’re now connected to the official volunteer system, *${vol.name}*.

You will receive:
• Check-in & check-out confirmations
• Task assignments
• Approval / rejection updates
• Important event alerts

🔔 Keep Telegram notifications ON during the event.
Let’s make this hackathon smooth and impactful 🚀`;

                return sendTelegramMessage(botToken, chatId, welcomeMsg);
            }
        }

        return new Response(JSON.stringify({ success: true, message: "No action taken" }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
        });
    }
});

async function sendTelegramMessage(botToken: string, chatId: number | string, text: string) {
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
    return new Response(JSON.stringify(data), {
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
    });
}
