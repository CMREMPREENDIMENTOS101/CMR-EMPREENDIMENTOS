import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import HHChart from '@/components/HHChart'
import type { ObraStatus, OcorrClasse } from '@/types/supabase'

const STATUS_CONFIG: Record<ObraStatus, { label: string; badge: string }> = {
  em_andamento: { label: 'Em andamento', badge: 'bg-green-100 text-green-700' },
  paralisada: { label: 'Paralisada', badge: 'bg-yellow-100 text-yellow-700' },
  concluida: { label: 'Concluída', badge: 'bg-gray-100 text-gray-600' },
}

const OCORR_CONFIG: Record<OcorrClasse, { label: string; style: string; dot: string }> = {
  critica: { label: 'Crítica', style: 'bg-red-50 border border-red-200', dot: 'bg-red-500' },
  alerta: { label: 'Alerta', style: 'bg-yellow-50 border border-yellow-200', dot: 'bg-yellow-500' },
  informativa: { label: 'Informativa', style: 'bg-gray-50', dot: 'bg-gray-400' },
}

export default async function ObraDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ── Round 1: dados principais ────────────────────────────────────
  const [{ data: obra }, { data: etapas }, { data: diarios }] = await Promise.all([
    supabase.from('obras').select('*').eq('id', id).single(),
    supabase.from('etapas').select('id, nome, percentual_real, percentual_previsto').eq('obra_id', id).order('nome'),
    supabase.from('diarios').select('id, data, status').eq('obra_id', id).order('data', { ascending: false }),
  ])

  if (!obra) notFound()

  // ── Round 2: HH e alertas (dependem dos IDs dos diários) ─────────
  const dataCorte = new Date()
  dataCorte.setDate(dataCorte.getDate() - 29)
  const dataCorteStr = dataCorte.toISOString().split('T')[0]

  const diariosRecentes = (diarios ?? []).filter((d) => d.data >= dataCorteStr)
  const ids30 = diariosRecentes.map((d) => d.id)

  let mdoRange: { diario_id: string; quantidade: number; horas: number }[] = []
  let alertasRaw: { id: string; descricao: string; classe: OcorrClasse; diario_id: string }[] = []

  if (ids30.length > 0) {
    const [{ data: mdo }, { data: alertasData }] = await Promise.all([
      supabase
        .from('diario_mao_de_obra')
        .select('diario_id, quantidade, horas')
        .in('diario_id', ids30),
      supabase
        .from('diario_ocorrencias')
        .select('id, descricao, classe, diario_id')
        .in('diario_id', ids30)
        .in('classe', ['critica', 'alerta']),
    ])
    mdoRange = mdo ?? []
    alertasRaw = (alertasData ?? []) as typeof alertasRaw
  }

  // ── Cálculos ──────────────────────────────────────────────────────
  const avanco =
    etapas && etapas.length > 0
      ? Math.round(etapas.reduce((s, e) => s + e.percentual_real, 0) / etapas.length)
      : 0

  const diasCorridos = obra.data_inicio
    ? Math.max(0, Math.floor((Date.now() - new Date(obra.data_inicio + 'T00:00:00').getTime()) / 86400000))
    : null

  // HH por data
  const hhMap = new Map<string, number>()
  for (const d of diariosRecentes) hhMap.set(d.data, 0)
  for (const r of mdoRange) {
    const d = diariosRecentes.find((d) => d.id === r.diario_id)
    if (d) hhMap.set(d.data, (hhMap.get(d.data) ?? 0) + r.quantidade * r.horas)
  }
  const hhData = Array.from(hhMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([data, hh]) => ({
      label: new Date(data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      hh: Math.round(hh * 10) / 10,
    }))

  const totalHH30 = Math.round(mdoRange.reduce((s, r) => s + r.quantidade * r.horas, 0))

  // Alertas recentes
  const alertasComData = alertasRaw
    .map((a) => ({ ...a, data: diariosRecentes.find((d) => d.id === a.diario_id)?.data ?? '' }))
    .filter((a) => a.data)
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 5)

  const cfg = STATUS_CONFIG[obra.status as ObraStatus]
  const hoje = new Date().toISOString().split('T')[0]

  const navLinks = [
    { href: `/obras/${id}/diario`, label: 'Diários', icon: '📋' },
    { href: `/obras/${id}/cronograma`, label: 'Cronograma', icon: '📅' },
    { href: `/obras/${id}/relatorios`, label: 'Relatórios', icon: '📊' },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link href="/obras" className="text-sm text-gray-400 hover:text-gray-600">
          ← Obras
        </Link>
        <div className="flex items-start justify-between mt-2 gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">{obra.nome}</h1>
            {obra.endereco && <p className="text-sm text-gray-500 mt-0.5">{obra.endereco}</p>}
          </div>
          <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.badge}`}>
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Nav */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {navLinks.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 hover:border-orange-300 hover:text-orange-600 rounded-lg text-sm font-medium text-gray-700 transition-colors"
          >
            <span>{l.icon}</span>
            {l.label}
          </Link>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Avanço médio</p>
          <p className="text-2xl font-bold text-gray-900">{avanco}%</p>
          <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full" style={{ width: `${avanco}%` }} />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Diários</p>
          <p className="text-2xl font-bold text-gray-900">{diarios?.length ?? 0}</p>
          <p className="text-xs text-gray-400 mt-1">registros totais</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">HH — últimos 30d</p>
          <p className="text-2xl font-bold text-gray-900">{totalHH30}</p>
          <p className="text-xs text-gray-400 mt-1">homem-hora</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Dias corridos</p>
          <p className="text-2xl font-bold text-gray-900">{diasCorridos ?? '—'}</p>
          <p className="text-xs text-gray-400 mt-1">desde o início</p>
        </div>
      </div>

      {/* HH por período + Alertas */}
      <div className="grid md:grid-cols-3 gap-4 mb-4">
        <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">HH por dia — últimos 30 dias</h2>
            <span className="text-xs text-gray-400">{totalHH30} HH total</span>
          </div>
          <HHChart data={hhData} />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Ocorrências recentes
            {alertasComData.filter(a => a.classe === 'critica').length > 0 && (
              <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">
                {alertasComData.filter(a => a.classe === 'critica').length} crítica{alertasComData.filter(a => a.classe === 'critica').length !== 1 ? 's' : ''}
              </span>
            )}
          </h2>
          {alertasComData.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center">Nenhuma ocorrência crítica ou alerta nos últimos 30 dias</p>
          ) : (
            <ul className="space-y-2">
              {alertasComData.map((a) => {
                const ocfg = OCORR_CONFIG[a.classe]
                return (
                  <li key={a.id} className={`rounded-lg p-2.5 ${ocfg.style}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ocfg.dot}`} />
                      <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{ocfg.label}</span>
                      <span className="text-[10px] text-gray-400 ml-auto">
                        {new Date(a.data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-700 line-clamp-2">{a.descricao}</p>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Etapas + Info */}
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Etapas</h2>
            <span className="text-xs text-gray-400">{etapas?.length ?? 0} etapa{(etapas?.length ?? 0) !== 1 ? 's' : ''}</span>
          </div>
          {!etapas || etapas.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Nenhuma etapa cadastrada.</p>
          ) : (
            <ul className="space-y-3">
              {etapas.map((e) => (
                <li key={e.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700 truncate max-w-[60%]">{e.nome}</span>
                    <div className="flex items-center gap-2 text-xs text-gray-500 flex-shrink-0">
                      <span className="text-orange-600 font-semibold">{e.percentual_real}%</span>
                      <span>/ {e.percentual_previsto}% prev.</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden relative">
                    {/* Previsto (fundo) */}
                    <div
                      className="absolute h-full bg-gray-200 rounded-full"
                      style={{ width: `${e.percentual_previsto}%` }}
                    />
                    {/* Real */}
                    <div
                      className={`absolute h-full rounded-full ${e.percentual_real >= e.percentual_previsto ? 'bg-green-500' : 'bg-orange-500'}`}
                      style={{ width: `${e.percentual_real}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Informações</h2>
          <dl className="space-y-2 text-sm">
            {obra.tipo && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Tipo</dt>
                <dd className="font-medium capitalize">{obra.tipo}</dd>
              </div>
            )}
            {obra.responsavel_tecnico && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Responsável</dt>
                <dd className="font-medium">{obra.responsavel_tecnico}</dd>
              </div>
            )}
            {obra.data_inicio && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Início</dt>
                <dd className="font-medium">
                  {new Date(obra.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR')}
                </dd>
              </div>
            )}
            {obra.previsao_termino && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Previsão término</dt>
                <dd className="font-medium">
                  {new Date(obra.previsao_termino + 'T00:00:00').toLocaleDateString('pt-BR')}
                </dd>
              </div>
            )}
            {obra.art_rrt && (
              <div className="flex justify-between">
                <dt className="text-gray-500">ART/RRT</dt>
                <dd className="font-medium">{obra.art_rrt}</dd>
              </div>
            )}
            {obra.numero_contrato && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Contrato</dt>
                <dd className="font-medium">{obra.numero_contrato}</dd>
              </div>
            )}
            {diasCorridos !== null && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Dias corridos</dt>
                <dd className="font-medium">{diasCorridos} dias</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Últimos diários */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Últimos diários</h2>
          <Link href={`/obras/${id}/diario`} className="text-xs text-orange-500 hover:text-orange-700 font-medium">
            Ver calendário →
          </Link>
        </div>
        {!diarios || diarios.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">Nenhum diário registrado.</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {diarios.slice(0, 7).map((d) => (
              <li key={d.id}>
                <Link
                  href={`/obras/${id}/diario/${d.data}`}
                  className="flex items-center justify-between text-sm hover:text-orange-600 py-2 transition-colors"
                >
                  <span>
                    {new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR', {
                      weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
                    })}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    d.status === 'aprovado'
                      ? 'bg-green-100 text-green-700'
                      : d.status === 'preenchido'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {d.status === 'aprovado' ? 'Aprovado' : d.status === 'preenchido' ? 'Preenchido' : 'Rascunho'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link
          href={`/obras/${id}/diario/${hoje}`}
          className="mt-3 flex items-center justify-center w-full py-2 border-2 border-dashed border-orange-200 rounded-lg text-sm text-orange-500 hover:bg-orange-50 transition-colors font-medium"
        >
          + Registrar diário de hoje
        </Link>
      </div>
    </div>
  )
}
