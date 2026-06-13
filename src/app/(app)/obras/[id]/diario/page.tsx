import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import type { Etapa } from '@/types/supabase'
import ListaTarefasClient from './ListaTarefasClient'

export default async function DiarioListPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: obra }, { data: etapasRaw }] = await Promise.all([
    supabase.from('obras').select('id, nome').eq('id', id).single(),
    supabase.from('etapas').select('*').eq('obra_id', id).order('ordem').order('nome'),
  ])

  if (!obra) notFound()

  const etapas = (etapasRaw ?? []) as Etapa[]

  return <ListaTarefasClient obraId={id} etapas={etapas} />
}
