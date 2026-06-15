'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface EtapaPayload {
  nome: string
  etapa_pai_id: string | null
  data_inicio_prev: string | null
  data_fim_prev: string | null
  data_inicio_real: string | null
  data_fim_real: string | null
  percentual_previsto: number
  percentual_real: number
  ordem: number
}

export async function criarEtapa(obraId: string, payload: EtapaPayload) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase.from('etapas').insert({ obra_id: obraId, ...payload })
  if (error) return { error: error.message }

  revalidatePath(`/obras/${obraId}/cronograma`)
  revalidatePath(`/obras/${obraId}/diario`)
  return { success: true }
}

export async function atualizarEtapa(obraId: string, etapaId: string, payload: Partial<EtapaPayload>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase.from('etapas').update(payload).eq('id', etapaId).eq('obra_id', obraId)
  if (error) return { error: error.message }

  revalidatePath(`/obras/${obraId}/cronograma`)
  revalidatePath(`/obras/${obraId}/diario`)
  return { success: true }
}

export async function excluirEtapa(obraId: string, etapaId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase.from('etapas').delete().eq('id', etapaId).eq('obra_id', obraId)
  if (error) return { error: error.message }

  revalidatePath(`/obras/${obraId}/cronograma`)
  revalidatePath(`/obras/${obraId}/diario`)
  return { success: true }
}
