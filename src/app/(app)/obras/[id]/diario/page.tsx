import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import GanttView from '../cronograma/GanttView'
import type { PerfilGlobal } from '@/types/supabase'

export default async function DiarioListPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: obra }, { data: usuarioRow }, { data: etapas }] = await Promise.all([
    supabase.from('obras').select('id, nome, data_inicio, previsao_termino').eq('id', id).single(),
    supabase.from('usuarios').select('perfil').eq('id', user.id).single(),
    supabase.from('etapas').select('*').eq('obra_id', id).order('ordem').order('nome'),
  ])

  if (!obra) notFound()

  const perfil = (usuarioRow?.perfil ?? 'encarregado') as PerfilGlobal

  return (
    <GanttView
      obraId={id}
      obraDataInicio={obra.data_inicio}
      obraDataFim={obra.previsao_termino}
      etapas={etapas ?? []}
      perfil={perfil}
    />
  )
}
