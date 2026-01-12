import { createAdminClient, corsHeaders, logAudit } from "../_shared/utils.js";

Deno.serve(async (req: any) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { id, type, status, note, org, approved_by } = await req.json();
    const suffix = org === 'ITECPEC' ? 'itecpec' : 'capec';

    const table = type === 'task' ? `tasks_${suffix}` : `attendance_${suffix}`;

    const supabase = createAdminClient();

    // 1. Update the record
    const { data: item, error: updateErr } = await supabase
      .from(table)
      .update({ status })
      .eq('id', id)
      .select('*, volunteers_' + suffix + '(name, telegram_id, unique_code)')
      .single();

    if (updateErr) throw updateErr;

    // 2. Fetch volunteer info (select above already includes it)
    const vol = item[`volunteers_${suffix}`];

    // 3. Log Audit
    await logAudit(supabase, org, approved_by, 'approve', table, id, { status, note, volunteer: vol?.name });

    // 4. Send Telegram Notification
    if (vol?.telegram_id) {
      const botUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/telegram-bot`;
      // @ts-ignore
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

      const isTask = type === 'task';
      const statusText = status === 'approved' ? '✅ *Approved*' : '❌ *Declined*';
      const emoji = status === 'approved' ? '🎉' : '⚠️';

      let message = `${emoji} *Item ${status === 'approved' ? 'Approved' : 'Declined'}*\n\n`;
      message += `Type: ${isTask ? '🛠 Task' : '🕒 Attendance'}\n`;

      if (isTask) {
        message += `Title: ${item.title || 'Untitled Task'}\n`;
      } else {
        const date = new Date(item.entry_time).toLocaleDateString();
        message += `Date: ${date}\n`;
      }

      message += `Status: ${statusText}\n`;
      if (note) message += `Note: ${note}\n`;

      if (status === 'approved') {
        message += `\nGreat job! Keep up the good work. 🚀`;
      }

      try {
        await fetch(botUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}` },
          body: JSON.stringify({ message, chat_id: vol.telegram_id })
        });
      } catch (err) {
        console.error("Telegram Approval Notify Error:", err);
      }
    }

    return new Response(JSON.stringify({ success: true, data: item }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
