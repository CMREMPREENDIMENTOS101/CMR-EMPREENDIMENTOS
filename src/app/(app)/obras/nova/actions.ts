'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { ObraTipo, ObraStatus } from '@/types/supabase'

export async function criarObra(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const membrosIds = formData.getAll('membros') as string[]

  const { data: obra, error } = await supabase
    .from('obras')
    .insert({
      nome: formData.get('nome') as string,
      endereco: (formData.get('endereco') as string) || null,
      tipo: (formData.get('tipo') as ObraTipo) || null,
      data_inicio: (formData.get('data_inicio') as string) || null,
      previsao_termino: (formData.get('previsao_termino') as string) || null,
      responsavel_tecnico: (formData.get('responsavel_tecnico') as string) || null,
      art_rrt: (formData.get('art_rrt') as string) || null,
      numero_contrato: (formData.get('numero_contrato') as string) || null,
      status: 'em_andamento' as ObraStatus,
      created_by: user.id,
    })
    .select()
    .single()

  if (error || !obra) {
    redirect('/obras/nova?error=1')
  }

  // Adicionar criador + equipe selecionada a obra_membros
  const membros = [...new Set([user.id, ...membrosIds])].map((uid) => ({
    obra_id: obra.id,
    usuario_id: uid,
  }))

  await supabase.from('obra_membros').insert(membros)

  revalidatePath('/obras')
  redirect(`/obras/${obra.id}`)
}
