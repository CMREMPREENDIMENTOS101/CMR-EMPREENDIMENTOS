import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import GanttView from './GanttView'
import type { PerfilGlobal } from '@/types/supabase'

export default async function CronogramaPage({
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
    <div className="p-6 max-w-full">
      {/* Breadcrumb */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Link href="/obras" className="hover:text-gray-600">Obras</Link>
          <span>/</span>
          <Link href={`/obras/${id}`} className="hover:text-gray-600">{obra.nome}</Link>
          <span>/</span>
          <span className="text-gray-700 font-medium">Cronograma</span>
        </div>
      </div>

      <GanttView
        obraId={id}
        obraDataInicio={obra.data_inicio}
        obraDataFim={obra.previsao_termino}
        etapas={etapas ?? []}
        perfil={perfil}
      />
    </div>
  )
}
