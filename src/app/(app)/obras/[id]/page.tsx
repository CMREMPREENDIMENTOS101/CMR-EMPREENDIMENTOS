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

const card = {
  background: '#1e293b',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.07)',
  padding: 20,
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

  const [{ data: obra }, { data: etapas }, { data: diarios }] = await Promise.all([
    supabase.from('obras').select('*').eq('id', id).single(),
    supabase.from('etapas').select('id, nome, percentual_real, percentual_previsto').eq('obra_id', id).order('nome'),
    supabase.from('diarios').select('id, data, status').eq('obra_id', id).order('data', { ascending: false }),
  ])

  if (!obra) notFound()

  const dataCorte = new Date()
  dataCorte.setDate(dataCorte.getDate() - 29)
  const dataCorteStr = dataCorte.toISOString().split('T')[0]

  const diariosRecentes = (diarios ?? []).filter((d) => d.data >= dataCorteStr)
  const ids30 = diariosRecentes.map((d) => d.id)

  let mdoRange: { diario_id: string; quantidade: number; horas: number }[] = []
  let alertasRaw: { id: string; descricao: string; classe: OcorrClasse; diario_id: string }[] = []

  if (ids30.length > 0) {
    const [{ data: mdo }, { data: alertasData }] = await Promise.all([
      supabase.from('diario_mao_de_obra').select('diario_id, quantidade, horas').in('diario_id', ids30),
      supabase.from('diario_ocorrencias').select('id, descricao, classe, diario_id').in('diario_id', ids30).in('classe', ['critica', 'alerta']),
    ])
    mdoRange = mdo ?? []
    alertasRaw = (alertasData ?? []) as typeof alertasRaw
  }

  const avanco =
    etapas && etapas.length > 0
      ? Math.round(etapas.reduce((s, e) => s + e.percentual_real, 0) / etapas.length)
      : 0

  const diasCorridos = obra.data_inicio
    ? Math.max(0, Math.floor((Date.now() - new Date(obra.data_inicio + 'T00:00:00').getTime()) / 86400000))
    : null

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

  const alertasComData = alertasRaw
    .map((a) => ({ ...a, data: diariosRecentes.find((d) => d.id === a.diario_id)?.data ?? '' }))
    .filter((a) => a.data)
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 5)

  const cfg = STATUS_CONFIG[obra.status as ObraStatus]
  const hoje = new Date().toISOString().split('T')[0]

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', lineHeight: 1.3, margin: 0 }}>{obra.nome}</h1>
          {obra.endereco && <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{obra.endereco}</p>}
        </div>
        <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.badge}`}>
          {cfg.label}
        </span>
      </div>

      {/* Nav links */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { href: `/obras/${id}/diario`, label: 'Lista de Tarefas', icon: '📋' },
          { href: `/obras/${id}/cronograma`, label: 'Cronograma', icon: '📅' },
          { href: `/obras/${id}/relatorios`, label: 'Relatórios', icon: '📊' },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px',
              background: '#1e293b',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              fontSize: 13, fontWeight: 500, color: '#94a3b8',
              textDecoration: 'none',
              transition: 'all 0.15s',
            }}
          >
            <span>{l.icon}</span>
            {l.label}
          </Link>
        ))}
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div style={{ ...card, padding: '14px 16px' }}>
          <p style={{ fontSize: 10, color: '#64748b', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '.06em' }}>Avanço</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{avanco}%</p>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 99, marginTop: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#dc2626', borderRadius: 99, width: `${avanco}%` }} />
          </div>
        </div>
        <div style={{ ...card, padding: '14px 16px' }}>
          <p style={{ fontSize: 10, color: '#64748b', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '.06em' }}>Diários</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{diarios?.length ?? 0}</p>
          <p style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>registros</p>
        </div>
        <div style={{ ...card, padding: '14px 16px' }}>
          <p style={{ fontSize: 10, color: '#64748b', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '.06em' }}>HH 30d</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{totalHH30}</p>
          <p style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>homem-hora</p>
        </div>
        <div style={{ ...card, padding: '14px 16px' }}>
          <p style={{ fontSize: 10, color: '#64748b', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '.06em' }}>Dias</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{diasCorridos ?? '—'}</p>
          <p style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>corridos</p>
        </div>
      </div>

      {/* HH chart + Alertas */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ ...card, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', margin: 0 }}>HH por dia — últimos 30 dias</h2>
            <span style={{ fontSize: 11, color: '#475569' }}>{totalHH30} HH total</span>
          </div>
          <HHChart data={hhData} />
        </div>

        <div style={{ ...card, padding: 20 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            Ocorrências recentes
            {alertasComData.filter(a => a.classe === 'critica').length > 0 && (
              <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">
                {alertasComData.filter(a => a.classe === 'critica').length} crítica{alertasComData.filter(a => a.classe === 'critica').length !== 1 ? 's' : ''}
              </span>
            )}
          </h2>
          {alertasComData.length === 0 ? (
            <p style={{ fontSize: 12, color: '#475569', padding: '20px 0', textAlign: 'center' }}>
              Nenhuma ocorrência nos últimos 30 dias
            </p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ ...card, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', margin: 0 }}>Etapas</h2>
            <span style={{ fontSize: 11, color: '#475569' }}>{etapas?.length ?? 0} etapa{(etapas?.length ?? 0) !== 1 ? 's' : ''}</span>
          </div>
          {!etapas || etapas.length === 0 ? (
            <p style={{ fontSize: 13, color: '#475569', padding: '16px 0', textAlign: 'center' }}>Nenhuma etapa cadastrada.</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {etapas.map((e) => (
                <li key={e.id}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#cbd5e1', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.nome}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#64748b' }}>
                      <span style={{ color: '#dc2626', fontWeight: 600 }}>{e.percentual_real}%</span>
                      <span>/ {e.percentual_previsto}% prev.</span>
                    </div>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden', position: 'relative' }}>
                    <div style={{ position: 'absolute', height: '100%', background: 'rgba(255,255,255,0.15)', borderRadius: 99, width: `${e.percentual_previsto}%` }} />
                    <div style={{ position: 'absolute', height: '100%', background: e.percentual_real >= e.percentual_previsto ? '#22c55e' : '#dc2626', borderRadius: 99, width: `${e.percentual_real}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ ...card, padding: 20 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 12 }}>Informações</h2>
          <dl style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {obra.tipo && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <dt style={{ color: '#64748b' }}>Tipo</dt>
                <dd style={{ color: '#cbd5e1', fontWeight: 500 }}>{obra.tipo}</dd>
              </div>
            )}
            {obra.responsavel_tecnico && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <dt style={{ color: '#64748b' }}>Responsável</dt>
                <dd style={{ color: '#cbd5e1', fontWeight: 500 }}>{obra.responsavel_tecnico}</dd>
              </div>
            )}
            {obra.data_inicio && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <dt style={{ color: '#64748b' }}>Início</dt>
                <dd style={{ color: '#cbd5e1', fontWeight: 500 }}>
                  {new Date(obra.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR')}
                </dd>
              </div>
            )}
            {obra.previsao_termino && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <dt style={{ color: '#64748b' }}>Previsão término</dt>
                <dd style={{ color: '#cbd5e1', fontWeight: 500 }}>
                  {new Date(obra.previsao_termino + 'T00:00:00').toLocaleDateString('pt-BR')}
                </dd>
              </div>
            )}
            {obra.art_rrt && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <dt style={{ color: '#64748b' }}>ART/RRT</dt>
                <dd style={{ color: '#cbd5e1', fontWeight: 500 }}>{obra.art_rrt}</dd>
              </div>
            )}
            {obra.numero_contrato && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <dt style={{ color: '#64748b' }}>Contrato</dt>
                <dd style={{ color: '#cbd5e1', fontWeight: 500 }}>{obra.numero_contrato}</dd>
              </div>
            )}
            {diasCorridos !== null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <dt style={{ color: '#64748b' }}>Dias corridos</dt>
                <dd style={{ color: '#cbd5e1', fontWeight: 500 }}>{diasCorridos} dias</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Últimos diários */}
      <div style={{ ...card, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', margin: 0 }}>Últimos diários</h2>
          <Link href={`/obras/${id}/diario`} style={{ fontSize: 12, color: '#dc2626', textDecoration: 'none', fontWeight: 500 }}>
            Ver lista →
          </Link>
        </div>
        {!diarios || diarios.length === 0 ? (
          <p style={{ fontSize: 13, color: '#475569', padding: '16px 0', textAlign: 'center' }}>Nenhum diário registrado.</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {diarios.slice(0, 7).map((d) => (
              <li key={d.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <Link
                  href={`/obras/${id}/diario/${d.data}`}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, padding: '8px 0', textDecoration: 'none', color: '#94a3b8' }}
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
          style={{
            marginTop: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '100%', padding: '10px 0',
            border: '2px dashed rgba(220,38,38,0.4)',
            borderRadius: 8,
            fontSize: 13, color: '#dc2626',
            textDecoration: 'none', fontWeight: 500,
          }}
        >
          + Registrar diário de hoje
        </Link>
      </div>
    </div>
  )
}
