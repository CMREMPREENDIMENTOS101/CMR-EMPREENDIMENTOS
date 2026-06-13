import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import RelatorioListClient from './RelatorioListClient'
import type { ReportData } from './RelatorioPDF'

export default async function RelatoriosPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ de?: string; ate?: string }>
}) {
  const { id } = await params
  const { de, ate } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: obra }, { data: todosOsDiarios }] = await Promise.all([
    supabase
      .from('obras')
      .select('id, nome, endereco, responsavel_tecnico, art_rrt, numero_contrato, data_inicio, previsao_termino')
      .eq('id', id)
      .single(),
    supabase
      .from('diarios')
      .select('id, data, status')
      .eq('obra_id', id)
      .order('data', { ascending: true }),
  ])

  if (!obra) notFound()

  const allIds = (todosOsDiarios ?? []).map((d) => d.id)

  const { data: fotosData } =
    allIds.length > 0
      ? await supabase.from('diario_fotos').select('diario_id').in('diario_id', allIds)
      : { data: [] as { diario_id: string }[] }

  const fotosMap = (fotosData ?? []).reduce(
    (acc, f) => { acc[f.diario_id] = (acc[f.diario_id] ?? 0) + 1; return acc },
    {} as Record<string, number>
  )

  const diariosComMeta = (todosOsDiarios ?? []).map((d, i) => ({
    id: d.id,
    data: d.data,
    status: (d.status ?? 'rascunho') as string,
    numero: i + 1,
    fotos: fotosMap[d.id] ?? 0,
  }))

  let reportData: ReportData | null = null

  if (
    de && ate &&
    /^\d{4}-\d{2}-\d{2}$/.test(de) &&
    /^\d{4}-\d{2}-\d{2}$/.test(ate) &&
    de <= ate
  ) {
    const { data: diariosRange } = await supabase
      .from('diarios')
      .select('id, data, status, clima_manha, clima_tarde, turno, observacoes')
      .eq('obra_id', id)
      .gte('data', de)
      .lte('data', ate)
      .in('status', ['preenchido', 'aprovado'])
      .order('data')

    const ids = (diariosRange ?? []).map((d) => d.id)

    const [{ data: mdo }, { data: equip }, { data: serv }, { data: mat }, { data: ocorr }] =
      ids.length > 0
        ? await Promise.all([
            supabase.from('diario_mao_de_obra').select('diario_id, funcao, quantidade, horas, subempreiteira_nome').in('diario_id', ids),
            supabase.from('diario_equipamentos').select('diario_id, nome, status, horas_uso').in('diario_id', ids),
            supabase.from('diario_servicos').select('diario_id, descricao, percentual_conclusao, localizacao').in('diario_id', ids),
            supabase.from('diario_materiais').select('diario_id, item, quantidade, unidade, fornecedor, nota_fiscal').in('diario_id', ids),
            supabase.from('diario_ocorrencias').select('diario_id, descricao, classe').in('diario_id', ids),
          ])
        : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }]

    reportData = {
      obra: {
        nome: obra.nome,
        endereco: obra.endereco,
        responsavel_tecnico: obra.responsavel_tecnico,
        art_rrt: obra.art_rrt,
        numero_contrato: obra.numero_contrato,
        data_inicio: obra.data_inicio,
        previsao_termino: obra.previsao_termino,
      },
      periodo: { de, ate },
      diarios: (diariosRange ?? []).map((d) => ({
        data: d.data,
        status: d.status ?? 'rascunho',
        clima_manha: d.clima_manha,
        clima_tarde: d.clima_tarde,
        turno: d.turno,
        observacoes: d.observacoes,
        mao_de_obra: (mdo ?? []).filter((r) => r.diario_id === d.id).map((r) => ({
          funcao: r.funcao, quantidade: r.quantidade, horas: r.horas, subempreiteira_nome: r.subempreiteira_nome,
        })),
        equipamentos: (equip ?? []).filter((r) => r.diario_id === d.id).map((r) => ({
          nome: r.nome, status: r.status, horas_uso: r.horas_uso,
        })),
        servicos: (serv ?? []).filter((r) => r.diario_id === d.id).map((r) => ({
          descricao: r.descricao, percentual_conclusao: r.percentual_conclusao, localizacao: r.localizacao,
        })),
        materiais: (mat ?? []).filter((r) => r.diario_id === d.id).map((r) => ({
          item: r.item, quantidade: r.quantidade, unidade: r.unidade, fornecedor: r.fornecedor, nota_fiscal: r.nota_fiscal,
        })),
        ocorrencias: (ocorr ?? []).filter((r) => r.diario_id === d.id).map((r) => ({
          descricao: r.descricao, classe: r.classe,
        })),
      })),
    }
  }

  const hoje = new Date().toISOString().split('T')[0]
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  const deDefault = de ?? inicioMes
  const ateDefault = ate ?? hoje
  const filename = `RDO-${obra.nome.replace(/\s+/g, '-')}-${de ?? hoje}.pdf`

  return (
    <div className="p-6">
      <div className="mb-5">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Link href="/obras" className="hover:text-gray-300">Obras</Link>
          <span>/</span>
          <Link href={`/obras/${id}`} className="hover:text-gray-300">{obra.nome}</Link>
          <span>/</span>
          <span style={{ color: '#f1f5f9' }} className="font-medium">Relatórios</span>
        </div>
      </div>

      <RelatorioListClient
        obraId={id}
        diarios={diariosComMeta}
        reportData={reportData}
        hoje={hoje}
        deDefault={deDefault}
        ateDefault={ateDefault}
        filename={filename}
      />
    </div>
  )
}
