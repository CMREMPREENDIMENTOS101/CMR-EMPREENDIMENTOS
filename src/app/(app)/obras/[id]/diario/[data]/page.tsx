import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import DiarioForm from './DiarioForm'
import type { PerfilGlobal, EquipStatus, OcorrClasse } from '@/types/supabase'

export default async function DiarioDiaPage({
  params,
}: {
  params: Promise<{ id: string; data: string }>
}) {
  const { id: obraId, data } = await params

  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: obra },
    { data: usuarioRow },
    { data: etapas },
    { data: diario },
  ] = await Promise.all([
    supabase.from('obras').select('id, nome').eq('id', obraId).single(),
    supabase.from('usuarios').select('perfil').eq('id', user.id).single(),
    supabase.from('etapas').select('id, nome').eq('obra_id', obraId).order('nome'),
    supabase
      .from('diarios')
      .select('id, status, clima_manha, clima_tarde, turno, observacoes')
      .eq('obra_id', obraId)
      .eq('data', data)
      .maybeSingle(),
  ])

  if (!obra) notFound()

  const perfil = (usuarioRow?.perfil ?? 'encarregado') as PerfilGlobal

  const initial: React.ComponentProps<typeof DiarioForm>['initial'] = {}

  if (diario) {
    initial.id = diario.id
    initial.status = diario.status ?? undefined
    initial.clima_manha = diario.clima_manha
    initial.clima_tarde = diario.clima_tarde
    initial.turno = diario.turno
    initial.observacoes = diario.observacoes

    const [
      { data: mdo },
      { data: equip },
      { data: serv },
      { data: mat },
      { data: ocorr },
    ] = await Promise.all([
      supabase.from('diario_mao_de_obra').select('*').eq('diario_id', diario.id),
      supabase.from('diario_equipamentos').select('*').eq('diario_id', diario.id),
      supabase.from('diario_servicos').select('*').eq('diario_id', diario.id),
      supabase.from('diario_materiais').select('*').eq('diario_id', diario.id),
      supabase.from('diario_ocorrencias').select('*').eq('diario_id', diario.id),
    ])

    initial.maoDeObra = (mdo ?? []).map((r) => ({
      id: r.id,
      funcao: r.funcao,
      quantidade: r.quantidade,
      horas: r.horas,
      subempreiteira_nome: r.subempreiteira_nome ?? '',
      subempreiteira_cnpj: r.subempreiteira_cnpj ?? '',
    }))

    initial.equipamentos = (equip ?? []).map((r) => ({
      id: r.id,
      nome: r.nome,
      status: r.status as EquipStatus,
      horas_uso: r.horas_uso ?? 0,
    }))

    initial.servicos = (serv ?? []).map((r) => ({
      id: r.id,
      descricao: r.descricao,
      etapa_id: r.etapa_id ?? '',
      percentual_conclusao: r.percentual_conclusao ?? 0,
      localizacao: r.localizacao ?? '',
    }))

    initial.materiais = (mat ?? []).map((r) => ({
      id: r.id,
      item: r.item,
      quantidade: r.quantidade != null ? String(r.quantidade) : '',
      unidade: r.unidade ?? '',
      fornecedor: r.fornecedor ?? '',
      nota_fiscal: r.nota_fiscal ?? '',
    }))

    initial.ocorrencias = (ocorr ?? []).map((r) => ({
      id: r.id,
      descricao: r.descricao,
      classe: r.classe as OcorrClasse,
    }))
  }

  const dataBR = new Date(data + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
          <Link href="/obras" className="hover:text-gray-600">Obras</Link>
          <span>/</span>
          <Link href={`/obras/${obraId}`} className="hover:text-gray-600">{obra.nome}</Link>
          <span>/</span>
          <Link href={`/obras/${obraId}/diario`} className="hover:text-gray-600">Diários</Link>
          <span>/</span>
          <span className="text-gray-700 font-medium capitalize">{dataBR}</span>
        </div>
      </div>

      <DiarioForm
        obraId={obraId}
        data={data}
        perfil={perfil}
        etapas={etapas ?? []}
        initial={initial}
      />
    </div>
  )
}
