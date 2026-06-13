'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { criarEtapa, atualizarEtapa, excluirEtapa, type EtapaPayload } from './actions'
import type { Etapa, PerfilGlobal } from '@/types/supabase'

// ─── helpers ─────────────────────────────────────────────────────────────────

function parseDate(s: string | null): Date | null {
  return s ? new Date(s + 'T00:00:00') : null
}

function etapaToForm(e: Etapa): EtapaPayload {
  return {
    nome: e.nome,
    etapa_pai_id: e.etapa_pai_id,
    data_inicio_prev: e.data_inicio_prev,
    data_fim_prev: e.data_fim_prev,
    data_inicio_real: e.data_inicio_real,
    data_fim_real: e.data_fim_real,
    percentual_previsto: e.percentual_previsto,
    percentual_real: e.percentual_real,
    ordem: e.ordem,
  }
}

function sortedRoots(etapas: Etapa[]) {
  return etapas.filter((e) => !e.etapa_pai_id).sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome))
}

function childrenOf(etapas: Etapa[], parentId: string) {
  return etapas.filter((e) => e.etapa_pai_id === parentId).sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome))
}

/** Flat sorted list preserving hierarchy */
function buildSorted(etapas: Etapa[]): Etapa[] {
  const result: Etapa[] = []
  for (const r of sortedRoots(etapas)) {
    result.push(r)
    result.push(...childrenOf(etapas, r.id))
  }
  const seen = new Set(result.map((e) => e.id))
  result.push(...etapas.filter((e) => !seen.has(e.id)))
  return result
}

/** Build hierarchical number map: id → "1", "1.1", "2.3" etc. */
function buildNumbers(etapas: Etapa[]): Map<string, string> {
  const map = new Map<string, string>()
  const roots = sortedRoots(etapas)
  roots.forEach((r, i) => {
    map.set(r.id, String(i + 1))
    childrenOf(etapas, r.id).forEach((c, j) => {
      map.set(c.id, `${i + 1}.${j + 1}`)
    })
  })
  return map
}

type Status = 'nao-iniciada' | 'andamento' | 'concluida'

function getStatus(e: Etapa): Status {
  if (e.percentual_real >= 100) return 'concluida'
  if (e.percentual_real > 0 || e.data_inicio_real) return 'andamento'
  return 'nao-iniciada'
}

function calcStats(etapas: Etapa[]) {
  const leaves = etapas // count all etapas including parents
  const naoIniciada = leaves.filter((e) => getStatus(e) === 'nao-iniciada').length
  const andamento   = leaves.filter((e) => getStatus(e) === 'andamento').length
  const concluida   = leaves.filter((e) => getStatus(e) === 'concluida').length
  const total       = leaves.length
  const realizado   = total > 0 ? leaves.reduce((s, e) => s + e.percentual_real, 0) / total : 0
  return { total, naoIniciada, andamento, concluida, realizado }
}

/** Weighted avg % of children (or own % if no children) */
function parentPct(etapas: Etapa[], parentId: string): number {
  const children = childrenOf(etapas, parentId)
  if (children.length === 0) {
    return etapas.find((e) => e.id === parentId)?.percentual_real ?? 0
  }
  return children.reduce((s, c) => s + c.percentual_real, 0) / children.length
}

// ─── S-curve ──────────────────────────────────────────────────────────────────

function useCurva(etapas: Etapa[], obraInicio: string | null, obraFim: string | null) {
  return useMemo(() => {
    const ts: number[] = []
    for (const e of etapas) {
      if (e.data_inicio_prev) ts.push(parseDate(e.data_inicio_prev)!.getTime())
      if (e.data_fim_prev)    ts.push(parseDate(e.data_fim_prev)!.getTime())
      if (e.data_inicio_real) ts.push(parseDate(e.data_inicio_real)!.getTime())
      if (e.data_fim_real)    ts.push(parseDate(e.data_fim_real)!.getTime())
    }
    if (obraInicio) ts.push(parseDate(obraInicio)!.getTime())
    if (obraFim)    ts.push(parseDate(obraFim)!.getTime())
    if (ts.length < 2) return null

    const start = new Date(Math.min(...ts)); start.setDate(start.getDate() - 15)
    const end   = new Date(Math.max(...ts)); end.setDate(end.getDate() + 15)
    const span  = end.getTime() - start.getTime()
    const totalW = etapas.reduce((s, e) => s + (e.percentual_previsto || 0), 0) || 1

    const points = Array.from({ length: 121 }, (_, i) => {
      const ratio = i / 120
      const t     = start.getTime() + span * ratio
      let planned = 0, actual = 0
      for (const e of etapas) {
        const w = (e.percentual_previsto || 0) / totalW
        if (e.data_inicio_prev && e.data_fim_prev) {
          const s = parseDate(e.data_inicio_prev)!.getTime()
          const f = parseDate(e.data_fim_prev)!.getTime()
          if (f > s) planned += w * 100 * Math.min(1, Math.max(0, (t - s) / (f - s)))
        }
        if (e.data_inicio_real) {
          const sr = parseDate(e.data_inicio_real)!.getTime()
          if (t >= sr) {
            if (e.data_fim_real) {
              const fr = parseDate(e.data_fim_real)!.getTime()
              actual += w * e.percentual_real * (fr > sr ? Math.min(1, (t - sr) / (fr - sr)) : 1)
            } else {
              actual += w * e.percentual_real
            }
          }
        }
      }
      return { ratio, planned, actual }
    })

    const months: { ratio: number; label: string }[] = []
    let cur = new Date(start.getFullYear(), start.getMonth(), 1)
    while (cur <= end) {
      const r = (cur.getTime() - start.getTime()) / span
      if (r >= 0 && r <= 1) months.push({ ratio: r, label: cur.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }) })
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
    }

    return { points, months, todayRatio: (Date.now() - start.getTime()) / span }
  }, [etapas, obraInicio, obraFim])
}

function CurvaChart({ curva }: { curva: ReturnType<typeof useCurva> }) {
  if (!curva) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 140, color: '#334155', fontSize: 12, fontStyle: 'italic' }}>
      Configure datas nas etapas para gerar a curva de avanço
    </div>
  )
  const { points, months, todayRatio } = curva
  const W = 800, H = 160, PAD = { t: 12, r: 16, b: 32, l: 40 }
  const pw = W - PAD.l - PAD.r, ph = H - PAD.t - PAD.b
  const x = (r: number) => PAD.l + r * pw
  const y = (v: number) => PAD.t + (1 - v / 100) * ph
  const pD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.ratio).toFixed(1)},${y(p.planned).toFixed(1)}`).join(' ')
  const aP = points.filter((p) => p.actual > 0.05)
  const aD = aP.length > 1 ? aP.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.ratio).toFixed(1)},${y(p.actual).toFixed(1)}`).join(' ') : null
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line x1={PAD.l} y1={y(v)} x2={PAD.l + pw} y2={y(v)} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
          <text x={PAD.l - 6} y={y(v) + 4} textAnchor="end" fontSize={9} fill="#334155">{v}%</text>
        </g>
      ))}
      {months.map(({ ratio, label }, i) => (
        <g key={i}>
          <line x1={x(ratio)} y1={PAD.t} x2={x(ratio)} y2={PAD.t + ph} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
          <text x={x(ratio)} y={H - 6} textAnchor="middle" fontSize={8} fill="#334155">{label}</text>
        </g>
      ))}
      {todayRatio >= 0 && todayRatio <= 1 && (
        <line x1={x(todayRatio)} y1={PAD.t} x2={x(todayRatio)} y2={PAD.t + ph} stroke="#f87171" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.7} />
      )}
      <path d={pD} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={2} strokeLinejoin="round" />
      {aD && <path d={aD} fill="none" stroke="#f97316" strokeWidth={2.5} strokeLinejoin="round" />}
      <rect x={PAD.l} y={PAD.t} width={pw} height={ph} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
    </svg>
  )
}

// ─── types ────────────────────────────────────────────────────────────────────

type DateField = 'data_inicio_prev' | 'data_fim_prev' | 'data_inicio_real' | 'data_fim_real'
type ModalState = null | 'add' | Etapa
type FilterStatus = 'todas' | 'nao-iniciada' | 'andamento' | 'concluida'

const EMPTY_FORM: EtapaPayload = {
  nome: '', etapa_pai_id: null,
  data_inicio_prev: null, data_fim_prev: null,
  data_inicio_real: null, data_fim_real: null,
  percentual_previsto: 100, percentual_real: 0, ordem: 0,
}

// ─── main component ───────────────────────────────────────────────────────────

interface Props {
  obraId: string
  obraDataInicio: string | null
  obraDataFim: string | null
  etapas: Etapa[]
  perfil: PerfilGlobal
}

export default function GanttView({ obraId, obraDataInicio, obraDataFim, etapas, perfil }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [modal,         setModal]         = useState<ModalState>(null)
  const [form,          setForm]          = useState<EtapaPayload>(EMPTY_FORM)
  const [msg,           setMsg]           = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // Local optimistic state
  const [etapasState, setEtapasState] = useState<Etapa[]>(etapas)
  useEffect(() => { setEtapasState(etapas) }, [etapas])

  // Filters
  const [search,            setSearch]            = useState('')
  const [filterStatus,      setFilterStatus]      = useState<FilterStatus>('todas')
  const [soEtapas,          setSoEtapas]          = useState(false)
  const [ocultarConcluidas, setOcultarConcluidas] = useState(false)

  const podeEditar = perfil === 'admin' || perfil === 'engenheiro'
  const sorted     = buildSorted(etapasState)
  const numbers    = buildNumbers(etapasState)
  const roots      = etapasState.filter((e) => !e.etapa_pai_id)
  const stats      = calcStats(etapasState)
  const curva      = useCurva(etapasState, obraDataInicio, obraDataFim)

  // Filtered rows
  const filtered = useMemo(() => {
    return sorted.filter((e) => {
      if (search && !e.nome.toLowerCase().includes(search.toLowerCase())) return false
      if (soEtapas && !!e.etapa_pai_id) return false
      if (ocultarConcluidas && e.percentual_real >= 100) return false
      if (filterStatus !== 'todas' && getStatus(e) !== filterStatus) return false
      return true
    })
  }, [sorted, search, soEtapas, ocultarConcluidas, filterStatus])

  // ── inline editing ──────────────────────────────────────────────────────
  function handleDateChange(id: string, field: DateField, val: string) {
    setEtapasState((p) => p.map((e) => e.id === id ? { ...e, [field]: val || null } : e))
  }
  function handleDateBlur(id: string, field: DateField, val: string) {
    atualizarEtapa(obraId, id, { [field]: val || null }).catch(() => {})
  }
  function handlePctChange(id: string, val: number) {
    const v = Math.max(0, Math.min(100, val))
    setEtapasState((p) => p.map((e) => e.id === id ? { ...e, percentual_real: v } : e))
  }
  function handlePctBlur(id: string, val: number) {
    atualizarEtapa(obraId, id, { percentual_real: Math.max(0, Math.min(100, val)) }).catch(() => {})
  }

  // ── modal ───────────────────────────────────────────────────────────────
  function openAdd()       { setForm({ ...EMPTY_FORM, ordem: etapas.length }); setModal('add'); setMsg('') }
  function openEdit(e: Etapa) { setForm(etapaToForm(e)); setModal(e); setMsg('') }
  function closeModal()    { setModal(null); setMsg('') }
  function handleFormChange(f: keyof EtapaPayload, v: string | number | null) { setForm((p) => ({ ...p, [f]: v })) }

  function handleSalvar() {
    startTransition(async () => {
      const payload: EtapaPayload = {
        ...form,
        data_inicio_prev: form.data_inicio_prev || null,
        data_fim_prev:    form.data_fim_prev    || null,
        data_inicio_real: form.data_inicio_real || null,
        data_fim_real:    form.data_fim_real    || null,
        etapa_pai_id:     form.etapa_pai_id     || null,
      }
      const res = modal === 'add'
        ? await criarEtapa(obraId, payload)
        : await atualizarEtapa(obraId, (modal as Etapa).id, payload)
      if (res?.error) { setMsg(res.error); return }
      closeModal(); router.refresh()
    })
  }

  function handleDelete(etapaId: string) {
    startTransition(async () => {
      const res = await excluirEtapa(obraId, etapaId)
      if (res?.error) { setMsg(res.error); return }
      setConfirmDelete(null); closeModal(); router.refresh()
    })
  }

  // ── shared styles ────────────────────────────────────────────────────────
  const dateInput: React.CSSProperties = {
    width: '100%', border: 'none', background: 'transparent',
    fontSize: 11, color: '#64748b', outline: 'none',
    cursor: podeEditar ? 'text' : 'default',
    padding: 0, fontFamily: 'inherit', colorScheme: 'dark',
  }

  // ── status colors ────────────────────────────────────────────────────────
  function barColor(pct: number) {
    if (pct >= 100) return '#22c55e'
    if (pct > 0)    return '#f97316'
    return 'transparent'
  }

  // ── empty state ──────────────────────────────────────────────────────────
  if (etapasState.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
        <p style={{ color: '#64748b', marginBottom: 4 }}>Nenhuma atividade cadastrada</p>
        <p style={{ fontSize: 13, color: '#334155', marginBottom: 24 }}>Adicione etapas para acompanhar o avanço da obra</p>
        {podeEditar && (
          <button onClick={openAdd} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Nova atividade
          </button>
        )}
        <EtapaModal modal={modal} form={form} roots={roots} podeEditar={podeEditar} isPending={isPending}
          msg={msg} confirmDelete={confirmDelete} onClose={closeModal} onChange={handleFormChange}
          onSalvar={handleSalvar} onDelete={handleDelete} onConfirmDelete={setConfirmDelete} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Curva de Avanço ─────────────────────────────────────── */}
      <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', padding: '14px 16px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.06em' }}>Curva de Avanço Físico</span>
          <div style={{ display: 'flex', gap: 14 }}>
            {([['rgba(255,255,255,0.25)', 'Previsto'], ['#f97316', 'Real'], ['#f87171', 'Hoje']] as [string, string][]).map(([c, l]) => (
              <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#475569' }}>
                <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke={c} strokeWidth="2" strokeDasharray={l === 'Hoje' ? '4 3' : undefined} /></svg>
                {l}
              </span>
            ))}
          </div>
        </div>
        <CurvaChart curva={curva} />
      </div>

      {/* ── Stats cards ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
        {[
          { label: 'Total',          value: stats.total,                     color: '#dc2626' },
          { label: 'Não iniciada',   value: stats.naoIniciada,               color: '#dc2626' },
          { label: 'Em andamento',   value: stats.andamento,                 color: '#f97316' },
          { label: 'Concluída',      value: stats.concluida,                 color: '#22c55e' },
          { label: 'Realizado',      value: `${stats.realizado.toFixed(2)}%`, color: '#f97316' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Filter bar ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <input
          type="search"
          placeholder="Pesquisa"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: '1 1 200px', minWidth: 160, padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: '#1e293b', color: '#e2e8f0', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
          style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: '#1e293b', color: '#94a3b8', fontSize: 13, outline: 'none', cursor: 'pointer', fontFamily: 'inherit', colorScheme: 'dark' }}
        >
          <option value="todas">Todas as atividades</option>
          <option value="nao-iniciada">Não iniciadas</option>
          <option value="andamento">Em andamento</option>
          <option value="concluida">Concluídas</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={soEtapas} onChange={(e) => setSoEtapas(e.target.checked)} style={{ accentColor: '#dc2626' }} />
          Exibir somente as etapas
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={ocultarConcluidas} onChange={(e) => setOcultarConcluidas(e.target.checked)} style={{ accentColor: '#dc2626' }} />
          Ocultar concluídas
        </label>
        {podeEditar && (
          <button onClick={openAdd}
            style={{ marginLeft: 'auto', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            + Nova atividade
          </button>
        )}
      </div>

      {/* ── Activity table ──────────────────────────────────────── */}
      <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
            <thead>
              <tr style={{ background: '#0f172a' }}>
                {[
                  { label: '#',             w: 54  },
                  { label: 'Atividade',     w: undefined },
                  { label: 'Início Plan.',  w: 110 },
                  { label: 'Fim Plan.',     w: 110 },
                  { label: 'Início Real',   w: 110 },
                  { label: 'Fim Real',      w: 110 },
                  { label: 'Avanço',        w: 180 },
                ].map(({ label, w }) => (
                  <th key={label} style={{ padding: '9px 12px', fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap', width: w }}>
                    {label}
                  </th>
                ))}
                {podeEditar && <th style={{ width: 36, borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#0f172a' }} />}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={podeEditar ? 8 : 7} style={{ textAlign: 'center', padding: '32px 16px', color: '#334155', fontSize: 13, fontStyle: 'italic' }}>
                    Nenhuma atividade encontrada
                  </td>
                </tr>
              ) : filtered.map((etapa) => {
                const isRoot    = !etapa.etapa_pai_id
                const num       = numbers.get(etapa.id) ?? ''
                const pct       = isRoot
                  ? parentPct(etapasState, etapa.id)
                  : etapa.percentual_real
                const status    = getStatus(etapa)
                const barFill   = barColor(pct)

                return (
                  <tr key={etapa.id} className="group"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: isRoot ? 'rgba(255,255,255,0.02)' : 'transparent' }}>

                    {/* # */}
                    <td style={{ padding: '10px 12px', fontSize: isRoot ? 13 : 12, fontWeight: isRoot ? 700 : 400, color: isRoot ? '#94a3b8' : '#475569' }}>
                      {num}
                    </td>

                    {/* Nome */}
                    <td style={{ padding: isRoot ? '10px 12px' : '10px 12px 10px 24px' }}>
                      <span style={{ fontSize: isRoot ? 14 : 13, fontWeight: isRoot ? 700 : 400, color: isRoot ? '#f1f5f9' : '#cbd5e1' }}>
                        {etapa.nome}
                      </span>
                    </td>

                    {/* Início Plan */}
                    <td style={{ padding: '6px 12px' }}>
                      <input type="date"
                        value={etapa.data_inicio_prev ?? ''}
                        disabled={!podeEditar}
                        onChange={(ev) => handleDateChange(etapa.id, 'data_inicio_prev', ev.target.value)}
                        onBlur={(ev)   => handleDateBlur(etapa.id,   'data_inicio_prev', ev.target.value)}
                        style={{ ...dateInput, color: etapa.data_inicio_prev ? '#64748b' : '#1e293b' }}
                      />
                    </td>

                    {/* Fim Plan */}
                    <td style={{ padding: '6px 12px' }}>
                      <input type="date"
                        value={etapa.data_fim_prev ?? ''}
                        disabled={!podeEditar}
                        onChange={(ev) => handleDateChange(etapa.id, 'data_fim_prev', ev.target.value)}
                        onBlur={(ev)   => handleDateBlur(etapa.id,   'data_fim_prev', ev.target.value)}
                        style={{ ...dateInput, color: etapa.data_fim_prev ? '#64748b' : '#1e293b' }}
                      />
                    </td>

                    {/* Início Real */}
                    <td style={{ padding: '6px 12px' }}>
                      <input type="date"
                        value={etapa.data_inicio_real ?? ''}
                        disabled={!podeEditar}
                        onChange={(ev) => handleDateChange(etapa.id, 'data_inicio_real', ev.target.value)}
                        onBlur={(ev)   => handleDateBlur(etapa.id,   'data_inicio_real', ev.target.value)}
                        style={{ ...dateInput, color: etapa.data_inicio_real ? '#94a3b8' : '#1e293b' }}
                      />
                    </td>

                    {/* Fim Real */}
                    <td style={{ padding: '6px 12px' }}>
                      <input type="date"
                        value={etapa.data_fim_real ?? ''}
                        disabled={!podeEditar}
                        onChange={(ev) => handleDateChange(etapa.id, 'data_fim_real', ev.target.value)}
                        onBlur={(ev)   => handleDateBlur(etapa.id,   'data_fim_real', ev.target.value)}
                        style={{ ...dateInput, color: etapa.data_fim_real ? '#94a3b8' : '#1e293b' }}
                      />
                    </td>

                    {/* Avanço */}
                    <td style={{ padding: '6px 12px' }}>
                      {isRoot ? (
                        /* Parent: show aggregate % + bar (read-only) */
                        <div>
                          <div style={{ fontSize: 11, color: barFill === 'transparent' ? '#334155' : barFill, fontWeight: 600, marginBottom: 3 }}>
                            {pct.toFixed(2)}%
                          </div>
                          <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: barColor(pct), transition: 'width .3s' }} />
                          </div>
                        </div>
                      ) : (
                        /* Child: editable % + bar */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 11, color: barFill === 'transparent' ? '#334155' : barFill, fontWeight: 600 }}>
                              {pct}%
                            </span>
                            {podeEditar && (
                              <input type="number" min={0} max={100}
                                value={etapa.percentual_real}
                                onChange={(ev) => handlePctChange(etapa.id, Number(ev.target.value))}
                                onBlur={(ev)   => handlePctBlur(etapa.id,   Number(ev.target.value))}
                                style={{ width: 40, border: 'none', background: 'rgba(255,255,255,0.05)', borderRadius: 4, color: '#64748b', fontSize: 11, textAlign: 'center', outline: 'none', padding: '1px 4px', fontFamily: 'inherit', cursor: 'text' }}
                              />
                            )}
                          </div>
                          <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: barColor(pct), transition: 'width .3s' }} />
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Edit */}
                    {podeEditar && (
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                        <button
                          onClick={() => openEdit(etapa)}
                          title="Editar"
                          className="group-hover:!opacity-100"
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, opacity: 0, transition: 'opacity .15s' }}
                        >
                          ✏️
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <EtapaModal modal={modal} form={form} roots={roots} podeEditar={podeEditar}
        isPending={isPending} msg={msg} confirmDelete={confirmDelete}
        onClose={closeModal} onChange={handleFormChange} onSalvar={handleSalvar}
        onDelete={handleDelete} onConfirmDelete={setConfirmDelete} />
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  modal: ModalState; form: EtapaPayload; roots: Etapa[]
  podeEditar: boolean; isPending: boolean; msg: string; confirmDelete: string | null
  onClose: () => void; onChange: (f: keyof EtapaPayload, v: string | number | null) => void
  onSalvar: () => void; onDelete: (id: string) => void; onConfirmDelete: (id: string | null) => void
}

function EtapaModal({ modal, form, roots, isPending, msg, confirmDelete, onClose, onChange, onSalvar, onDelete, onConfirmDelete }: ModalProps) {
  if (!modal) return null
  const isEdit  = modal !== 'add'
  const etapaId = isEdit ? (modal as Etapa).id : null

  const inp: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 8,
    background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
    color: '#e2e8f0', fontSize: 13, outline: 'none',
    boxSizing: 'border-box', colorScheme: 'dark', fontFamily: 'inherit',
  }
  const lbl: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} />
      <div style={{ position: 'relative', background: '#1e293b', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto', padding: 24 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>{isEdit ? 'Editar atividade' : 'Nova atividade'}</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={lbl}>Nome da atividade *</label>
            <input value={form.nome} onChange={(e) => onChange('nome', e.target.value)} style={inp} placeholder="Ex: Fundação, Estrutura, Revestimento..." />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Etapa pai</label>
              <select value={form.etapa_pai_id ?? ''} onChange={(e) => onChange('etapa_pai_id', e.target.value || null)} style={inp}>
                <option value="">— Atividade raiz</option>
                {roots.filter((r) => !isEdit || r.id !== etapaId).map((r) => (
                  <option key={r.id} value={r.id}>{r.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={lbl}>Ordem</label>
              <input type="number" min={0} value={form.ordem} onChange={(e) => onChange('ordem', Number(e.target.value))} style={inp} />
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 14 }}>
            <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.06em' }}>Datas planejadas</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={lbl}>Início</label><input type="date" value={form.data_inicio_prev ?? ''} onChange={(e) => onChange('data_inicio_prev', e.target.value || null)} style={inp} /></div>
              <div><label style={lbl}>Fim</label><input type="date" value={form.data_fim_prev ?? ''} onChange={(e) => onChange('data_fim_prev', e.target.value || null)} style={inp} /></div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 14 }}>
            <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.06em' }}>Datas reais</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={lbl}>Início</label><input type="date" value={form.data_inicio_real ?? ''} onChange={(e) => onChange('data_inicio_real', e.target.value || null)} style={inp} /></div>
              <div><label style={lbl}>Fim</label><input type="date" value={form.data_fim_real ?? ''} onChange={(e) => onChange('data_fim_real', e.target.value || null)} style={inp} /></div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={lbl}>% Planejado</label><input type="number" min={0} max={100} value={form.percentual_previsto} onChange={(e) => onChange('percentual_previsto', Number(e.target.value))} style={inp} /></div>
            <div><label style={lbl}>% Real</label><input type="number" min={0} max={100} value={form.percentual_real} onChange={(e) => onChange('percentual_real', Number(e.target.value))} style={inp} /></div>
          </div>

          {msg && <div style={{ padding: '10px 12px', background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 8, fontSize: 13, color: '#f87171' }}>{msg}</div>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 22 }}>
          {isEdit && etapaId && (confirmDelete === etapaId ? (
            <div style={{ display: 'flex', gap: 8, marginRight: 'auto' }}>
              <button onClick={() => onDelete(etapaId)} disabled={isPending}
                style={{ fontSize: 12, padding: '6px 12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', opacity: isPending ? .6 : 1 }}>
                Confirmar exclusão
              </button>
              <button onClick={() => onConfirmDelete(null)} style={{ fontSize: 12, color: '#64748b', background: 'transparent', border: 'none', cursor: 'pointer' }}>Cancelar</button>
            </div>
          ) : (
            <button onClick={() => onConfirmDelete(etapaId)} style={{ fontSize: 12, color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', marginRight: 'auto' }}>Excluir</button>
          ))}
          <button onClick={onClose} style={{ padding: '8px 16px', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', background: 'transparent', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={onSalvar} disabled={isPending || !form.nome.trim()}
            style={{ padding: '8px 20px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: isPending || !form.nome.trim() ? .6 : 1 }}>
            {isPending ? '...' : isEdit ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  )
}
