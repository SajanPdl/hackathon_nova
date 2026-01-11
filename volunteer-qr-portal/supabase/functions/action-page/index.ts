import { createAdminClient, corsHeaders, validateToken } from "../_shared/utils.js";

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const { token } = await req.json();
        if (!token) throw new Error("Token is required");

        const supabase = createAdminClient();
        const { valid, data, error }: any = await validateToken(supabase, token);

        if (!valid) {
            return new Response(JSON.stringify({ success: false, error }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            });
        }

        // Fetch details about the target record
        const { data: targetData } = await supabase
            .from(data.target_table)
            .select(`*, volunteers_${data.target_table.split('_')[1]}(name)`)
            .eq('id', data.target_id)
            .single();

        return new Response(JSON.stringify({
            success: true,
            token_data: data,
            target_data: targetData
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
