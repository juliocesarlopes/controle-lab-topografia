import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: req.headers.get('Authorization')!,
          },
        },
      }
    );

    // Fetch both aulas and agendamentos in parallel
    const [aulasResult, agendamentosResult] = await Promise.all([
      supabaseClient.from('aulas_fixas').select('*'),
      supabaseClient.from('agendamentos')
        .select('data_inicio, data_fim_prevista, agendamento_equipamentos(equipamentos(nome))')
        .in('status', ['Aprovado', 'Retirado'])
        .gte('data_fim_prevista', new Date().toISOString())
        .order('data_inicio', { ascending: true })
    ]);

    if (aulasResult.error) {
      throw aulasResult.error;
    }

    if (agendamentosResult.error) {
      throw agendamentosResult.error;
    }

    const data = {
      aulas: aulasResult.data,
      agendamentos: agendamentosResult.data
    };

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});