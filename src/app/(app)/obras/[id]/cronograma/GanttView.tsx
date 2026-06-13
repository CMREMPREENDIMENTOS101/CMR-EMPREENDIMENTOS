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

function sortEtapas(etapas: Etapa[]): Etapa[] {
  const roots = etapas
    .filter((e) => !e.etapa_pai_id)
    .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome))
  const result: Etapa[] = []
  for (const r of roots) {
    result.push(r)
    result.push(
      ...etapas
        .filter((e) => e.etapa_pai_id === r.id)
        .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome)),
    )
  }
  const seen = new Set(result.map((e) => e.id))
  result.push(...etapas.filter((e) => !seen.has(e.id)))
  return result
}

// ─── S-curve calculation ──────────────────────────────────────────────────────

function useCurvaAvanço(etapas: Etapa[], obraInicio: string | null, obraFim: string | null) {
  return useMemo(() => {
    const allDates: number[] = []
    for (const e of etapas) {
      if (e.data_inicio_prev) allDates.push(parseDate(e.data_inicio_prev)!.getTime())
      if (e.data_fim_prev)    allDates.push(parseDate(e.data_fim_prev)!.getTime())
      if (e.data_inicio_real) allDates.push(parseDate(e.data_inicio_real)!.getTime())
      if (e.data_fim_real)    allDates.push(parseDate(e.data_fim_real)!.getTime())
    }
    if (obraInicio) allDates.push(parseDate(obraInicio)!.getTime())
    if (obraFim)    allDates.push(parseDate(obraFim)!.getTime())

    if (allDates.length < 2) return null

    const tMin = Math.min(...allDates)
    const tMax = Math.max(...allDates)
    if (tMax <= tMin) return null

    const start = new Date(tMin)
    start.setDate(start.getDate() - 15)
    const end = new Date(tMax)
    end.setDate(end.getDate() + 15)

    const span = end.getTime() - start.getTime()
    const totalWeight = etapas.reduce((s, e) => s + (e.percentual_previsto || 0), 0) || 1

    const N = 120
    const points: { ratio: number; planned: number; actual: number }[] = []

    for (let i = 0; i <= N; i++) {
      const ratio = i / N
      const t = start.getTime() + span * ratio

      let planned = 0
      let actual  = 0

      for (const e of etapas) {
        const w = (e.percentual_previsto || 0) / totalWeight

        if (e.data_inicio_prev && e.data_fim_prev) {
          const s = parseDate(e.data_inicio_prev)!.getTime()
          const f = parseDate(e.data_fim_prev)!.getTime()
          if (f > s) {
            if (t >= f) planned += w * 100
            else if (t > s) planned += w * 100 * (t - s) / (f - s)
          }
        }

        if (e.data_inicio_real) {
          const sr = parseDate(e.data_inicio_real)!.getTime()
          if (t >= sr) {
            if (e.data_fim_real) {
              const fr = parseDate(e.data_fim_real)!.getTime()
              if (fr > sr) {
                if (t >= fr) actual += w * e.percentual_real
                else actual += w * e.percentual_real * (t - sr) / (fr - sr)
              }
            } else {
              actual += w * e.percentual_real
            }
          }
        }
      }

      points.push({ ratio, planned, actual })
    }

    // Generate month ticks
    const months: { ratio: number; label: string }[] = []
    let cur = new Date(start.getFullYear(), start.getMonth(), 1)
    while (cur <= end) {
      const r = (cur.getTime() - start.getTime()) / span
      if (r >= 0 && r <= 1) {
        months.push({
          ratio: r,
          label: cur.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        })
      }
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
    }

    const todayRatio = (Date.now() - start.getTime()) / span

    return { points, months, todayRatio }
  }, [etapas, obraInicio, obraFim])
}

// ─── S-curve SVG chart ────────────────────────────────────────────────────────

function CurvaAvanço({ curva }: { curva: ReturnType<typeof useCurvaAvanço> }) {
  if (!curva) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, color: '#334155', fontSize: 13, fontStyle: 'italic' }}>
        Configure datas nas etapas para ver a curva de avanço
      </div>
    )
  }

  const { points, months, todayRatio } = curva
  const W = 800, H = 180
  const PAD = { top: 16, right: 16, bottom: 36, left: 40 }
  const pw  = W - PAD.left - PAD.right
  const ph  = H - PAD.top  - PAD.bottom

  function x(ratio: number) { return PAD.left + ratio * pw }
  function y(pct: number)   { return PAD.top  + (1 - pct / 100) * ph }

  const plannedD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.ratio).toFixed(1)},${y(p.planned).toFixed(1)}`).join(' ')

  const actualPoints = points.filter((p) => p.actual > 0.05)
  const actualD = actualPoints.length > 1
    ? actualPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.ratio).toFixed(1)},${y(p.actual).toFixed(1)}`).join(' ')
    : null

  const yTicks = [0, 25, 50, 75, 100]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {/* Grid lines */}
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={PAD.left} y1={y(v)} x2={PAD.left + pw} y2={y(v)} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
          <text x={PAD.left - 6} y={y(v) + 4} textAnchor="end" fontSize={9} fill="#475569">{v}%</text>
        </g>
      ))}

      {/* Month ticks */}
      {months.map(({ ratio, label }, i) => (
        <g key={i}>
          <line x1={x(ratio)} y1={PAD.top} x2={x(ratio)} y2={PAD.top + ph} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
          <text x={x(ratio)} y={H - 8} textAnchor="middle" fontSize={8} fill="#334155">{label}</text>
        </g>
      ))}

      {/* Today */}
      {todayRatio >= 0 && todayRatio <= 1 && (
        <line x1={x(todayRatio)} y1={PAD.top} x2={x(todayRatio)} y2={PAD.top + ph}
          stroke="#f87171" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.7} />
      )}

      {/* Planned curve */}
      <path d={plannedD} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={2} strokeLinejoin="round" />

      {/* Actual curve */}
      {actualD && (
        <path d={actualD} fill="none" stroke="#dc2626" strokeWidth={2.5} strokeLinejoin="round" />
      )}

      {/* Border */}
      <rect x={PAD.left} y={PAD.top} width={pw} height={ph} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
    </svg>
  )
}

// ─── types ────────────────────────────────────────────────────────────────────

type DateField = 'data_inicio_prev' | 'data_fim_prev' | 'data_inicio_real' | 'data_fim_real'
type ModalState = null | 'add' | Etapa

const EMPTY_FORM: EtapaPayload = {
  nome: '',
  etapa_pai_id: null,
  data_inicio_prev: null,
  data_fim_prev: null,
  data_inicio_real: null,
  data_fim_real: null,
  percentual_previsto: 100,
  percentual_real: 0,
  ordem: 0,
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

  const [etapasState, setEtapasState] = useState<Etapa[]>(etapas)
  useEffect(() => { setEtapasState(etapas) }, [etapas])

  const podeEditar = perfil === 'admin' || perfil === 'engenheiro'
  const sorted     = sortEtapas(etapasState)
  const roots      = etapasState.filter((e) => !e.etapa_pai_id)
  const curva      = useCurvaAvanço(etapasState, obraDataInicio, obraDataFim)

  // ── inline editing ──────────────────────────────────────────────────────
  function handleDateChange(etapaId: string, field: DateField, value: string) {
    setEtapasState((prev) =>
      prev.map((e) => e.id === etapaId ? { ...e, [field]: value || null } : e),
    )
  }

  function handleDateBlur(etapaId: string, field: DateField, value: string) {
    atualizarEtapa(obraId, etapaId, { [field]: value || null }).catch(() => {})
  }

  function handlePctChange(etapaId: string, value: number) {
    const clamped = Math.max(0, Math.min(100, value))
    setEtapasState((prev) =>
      prev.map((e) => e.id === etapaId ? { ...e, percentual_real: clamped } : e),
    )
  }

  function handlePctBlur(etapaId: string, value: number) {
    const clamped = Math.max(0, Math.min(100, value))
    atualizarEtapa(obraId, etapaId, { percentual_real: clamped }).catch(() => {})
  }

  // ── modal ───────────────────────────────────────────────────────────────
  function openAdd() { setForm({ ...EMPTY_FORM, ordem: etapas.length }); setModal('add'); setMsg('') }
  function openEdit(e: Etapa) { setForm(etapaToForm(e)); setModal(e); setMsg('') }
  function closeModal() { setModal(null); setMsg('') }

  function handleFormChange(field: keyof EtapaPayload, value: string | number | null) {
    setForm((f) => ({ ...f, [field]: value }))
  }

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
      if (modal === 'add') {
        const res = await criarEtapa(obraId, payload)
        if (res?.error) { setMsg(res.error); return }
      } else if (modal && typeof modal === 'object') {
        const res = await atualizarEtapa(obraId, modal.id, payload)
        if (res?.error) { setMsg(res.error); return }
      }
      closeModal()
      router.refresh()
    })
  }

  function handleDelete(etapaId: string) {
    startTransition(async () => {
      const res = await excluirEtapa(obraId, etapaId)
      if (res?.error) { setMsg(res.error); return }
      setConfirmDelete(null)
      closeModal()
      router.refresh()
    })
  }

  // ── shared styles ───────────────────────────────────────────────────────
  const dateInput: React.CSSProperties = {
    width: '100%',
    border: 'none',
    background: 'transparent',
    fontSize: 11,
    color: '#cbd5e1',
    outline: 'none',
    cursor: podeEditar ? 'text' : 'default',
    padding: '2px 0',
    fontFamily: 'inherit',
    colorScheme: 'dark',
  }

  const TH: React.CSSProperties = {
    padding: '8px 10px',
    fontSize: 10,
    fontWeight: 700,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '.06em',
    textAlign: 'left',
    whiteSpace: 'nowrap',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: '#0f172a',
  }

  // ── empty state ─────────────────────────────────────────────────────────
  if (etapasState.length === 0) {
    return (
      <div style={{ textAlign: 'center', paddingTop: 80, paddingBottom: 80 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
        <p style={{ color: '#64748b', marginBottom: 4 }}>Nenhuma etapa cadastrada</p>
        <p style={{ fontSize: 13, color: '#334155', marginBottom: 24 }}>Adicione etapas para acompanhar o avanço da obra</p>
        {podeEditar && (
          <button onClick={openAdd}
            style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Nova etapa
          </button>
        )}
        <EtapaModal modal={modal} form={form} roots={roots} podeEditar={podeEditar}
          isPending={isPending} msg={msg} confirmDelete={confirmDelete}
          onClose={closeModal} onChange={handleFormChange} onSalvar={handleSalvar}
          onDelete={handleDelete} onConfirmDelete={setConfirmDelete} />
      </div>
    )
  }

  // ── render ──────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Page header ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>Linha de Avanço</h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#475569' }}>
            {etapasState.length} etapa{etapasState.length !== 1 ? 's' : ''}
          </p>
        </div>
        {podeEditar && (
          <button onClick={openAdd}
            style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Nova etapa
          </button>
        )}
      </div>

      {/* ── Curva de Avanço ─────────────────────────────────────── */}
      <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', padding: '16px 16px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Curva de Avanço Físico
          </span>
          <div style={{ display: 'flex', gap: 16 }}>
            {[
              { color: 'rgba(255,255,255,0.3)', label: 'Previsto' },
              { color: '#dc2626',               label: 'Real' },
              { color: '#f87171',               label: 'Hoje', dashed: true },
            ].map(({ color, label, dashed }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#475569' }}>
                <svg width="24" height="10">
                  <line x1="0" y1="5" x2="24" y2="5" stroke={color} strokeWidth="2"
                    strokeDasharray={dashed ? '4 3' : undefined} />
                </svg>
                {label}
              </div>
            ))}
          </div>
        </div>
        <CurvaAvanço curva={curva} />
      </div>

      {/* ── Tabela de Etapas ────────────────────────────────────── */}
      <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 780 }}>
            <thead>
              <tr>
                <th style={{ ...TH, width: 200 }}>Etapa</th>
                <th style={{ ...TH, width: 110, textAlign: 'center' }}>Início Plan.</th>
                <th style={{ ...TH, width: 110, textAlign: 'center' }}>Fim Plan.</th>
                <th style={{ ...TH, width: 110, textAlign: 'center' }}>Início Real</th>
                <th style={{ ...TH, width: 110, textAlign: 'center' }}>Fim Real</th>
                <th style={{ ...TH, minWidth: 160 }}>Avanço Físico</th>
                {podeEditar && <th style={{ ...TH, width: 40 }} />}
              </tr>
            </thead>
            <tbody>
              {sorted.map((etapa) => {
                const isChild = !!etapa.etapa_pai_id
                const pctPlan = etapa.percentual_previsto
                const pctReal = etapa.percentual_real
                const barColor = pctReal >= 100 ? '#22c55e' : pctReal > pctPlan ? '#f59e0b' : '#dc2626'

                return (
                  <tr key={etapa.id} className="group"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: isChild ? '#162032' : 'transparent' }}>

                    {/* Nome */}
                    <td style={{ padding: isChild ? '10px 12px 10px 28px' : '10px 12px' }}>
                      {isChild && <span style={{ color: 'rgba(255,255,255,0.2)', marginRight: 6, fontSize: 11 }}>└</span>}
                      <span style={{ fontSize: 13, fontWeight: isChild ? 400 : 500, color: '#e2e8f0' }}>{etapa.nome}</span>
                    </td>

                    {/* Início Plan */}
                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                      <input type="date"
                        value={etapa.data_inicio_prev ?? ''}
                        disabled={!podeEditar}
                        onChange={(ev) => handleDateChange(etapa.id, 'data_inicio_prev', ev.target.value)}
                        onBlur={(ev)   => handleDateBlur(etapa.id,   'data_inicio_prev', ev.target.value)}
                        style={{ ...dateInput, textAlign: 'center', color: etapa.data_inicio_prev ? '#94a3b8' : '#334155' }}
                      />
                    </td>

                    {/* Fim Plan */}
                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                      <input type="date"
                        value={etapa.data_fim_prev ?? ''}
                        disabled={!podeEditar}
                        onChange={(ev) => handleDateChange(etapa.id, 'data_fim_prev', ev.target.value)}
                        onBlur={(ev)   => handleDateBlur(etapa.id,   'data_fim_prev', ev.target.value)}
                        style={{ ...dateInput, textAlign: 'center', color: etapa.data_fim_prev ? '#94a3b8' : '#334155' }}
                      />
                    </td>

                    {/* Início Real */}
                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                      <input type="date"
                        value={etapa.data_inicio_real ?? ''}
                        disabled={!podeEditar}
                        onChange={(ev) => handleDateChange(etapa.id, 'data_inicio_real', ev.target.value)}
                        onBlur={(ev)   => handleDateBlur(etapa.id,   'data_inicio_real', ev.target.value)}
                        style={{ ...dateInput, textAlign: 'center', color: etapa.data_inicio_real ? '#f1f5f9' : '#334155' }}
                      />
                    </td>

                    {/* Fim Real */}
                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                      <input type="date"
                        value={etapa.data_fim_real ?? ''}
                        disabled={!podeEditar}
                        onChange={(ev) => handleDateChange(etapa.id, 'data_fim_real', ev.target.value)}
                        onBlur={(ev)   => handleDateBlur(etapa.id,   'data_fim_real', ev.target.value)}
                        style={{ ...dateInput, textAlign: 'center', color: etapa.data_fim_real ? '#f1f5f9' : '#334155' }}
                      />
                    </td>

                    {/* Progresso */}
                    <td style={{ padding: '6px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {/* Bar container */}
                        <div style={{ flex: 1, height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.07)', position: 'relative', overflow: 'hidden' }}>
                          {/* Planned fill */}
                          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pctPlan}%`, borderRadius: 99, background: 'rgba(255,255,255,0.12)' }} />
                          {/* Real fill */}
                          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pctReal}%`, borderRadius: 99, background: barColor, transition: 'width .3s' }} />
                        </div>
                        {/* % real editable */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                          <input
                            type="number" min={0} max={100}
                            value={pctReal}
                            disabled={!podeEditar}
                            onChange={(ev) => handlePctChange(etapa.id, Number(ev.target.value))}
                            onBlur={(ev)   => handlePctBlur(etapa.id,   Number(ev.target.value))}
                            style={{ width: 36, border: 'none', background: 'transparent', color: '#94a3b8', fontSize: 11, textAlign: 'right', outline: 'none', padding: 0, fontFamily: 'inherit', cursor: podeEditar ? 'text' : 'default' }}
                          />
                          <span style={{ fontSize: 11, color: '#475569' }}>%</span>
                        </div>
                      </div>
                    </td>

                    {/* Edit button */}
                    {podeEditar && (
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                        <button
                          onClick={() => openEdit(etapa)}
                          title="Editar etapa"
                          className="group-hover:!opacity-100"
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, opacity: 0, transition: 'opacity .15s', color: '#64748b' }}
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

      {/* ── Modal ───────────────────────────────────────────────── */}
      <EtapaModal
        modal={modal} form={form} roots={roots} podeEditar={podeEditar}
        isPending={isPending} msg={msg} confirmDelete={confirmDelete}
        onClose={closeModal} onChange={handleFormChange} onSalvar={handleSalvar}
        onDelete={handleDelete} onConfirmDelete={setConfirmDelete}
      />
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  modal: ModalState
  form: EtapaPayload
  roots: Etapa[]
  podeEditar: boolean
  isPending: boolean
  msg: string
  confirmDelete: string | null
  onClose: () => void
  onChange: (field: keyof EtapaPayload, value: string | number | null) => void
  onSalvar: () => void
  onDelete: (id: string) => void
  onConfirmDelete: (id: string | null) => void
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
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b',
    marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} />
      <div
        style={{ position: 'relative', background: '#1e293b', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto', padding: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>
            {isEdit ? 'Editar etapa' : 'Nova etapa'}
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={lbl}>Nome da etapa *</label>
            <input value={form.nome} onChange={(e) => onChange('nome', e.target.value)} style={inp}
              placeholder="Ex: Fundação, Estrutura, Revestimento..." />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Etapa pai</label>
              <select value={form.etapa_pai_id ?? ''} onChange={(e) => onChange('etapa_pai_id', e.target.value || null)} style={inp}>
                <option value="">— Etapa raiz</option>
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

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 16 }}>
            <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Datas planejadas
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>Início planejado</label>
                <input type="date" value={form.data_inicio_prev ?? ''} onChange={(e) => onChange('data_inicio_prev', e.target.value || null)} style={inp} />
              </div>
              <div>
                <label style={lbl}>Fim planejado</label>
                <input type="date" value={form.data_fim_prev ?? ''} onChange={(e) => onChange('data_fim_prev', e.target.value || null)} style={inp} />
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 16 }}>
            <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Datas reais
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>Início real</label>
                <input type="date" value={form.data_inicio_real ?? ''} onChange={(e) => onChange('data_inicio_real', e.target.value || null)} style={inp} />
              </div>
              <div>
                <label style={lbl}>Fim real</label>
                <input type="date" value={form.data_fim_real ?? ''} onChange={(e) => onChange('data_fim_real', e.target.value || null)} style={inp} />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>% Planejado</label>
              <input type="number" min={0} max={100} value={form.percentual_previsto} onChange={(e) => onChange('percentual_previsto', Number(e.target.value))} style={inp} />
            </div>
            <div>
              <label style={lbl}>% Real</label>
              <input type="number" min={0} max={100} value={form.percentual_real} onChange={(e) => onChange('percentual_real', Number(e.target.value))} style={inp} />
            </div>
          </div>

          {msg && (
            <div style={{ padding: '10px 12px', background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 8, fontSize: 13, color: '#f87171' }}>
              {msg}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 24 }}>
          {isEdit && etapaId && (
            confirmDelete === etapaId ? (
              <div style={{ display: 'flex', gap: 8, marginRight: 'auto' }}>
                <button onClick={() => onDelete(etapaId)} disabled={isPending}
                  style={{ fontSize: 12, padding: '6px 12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', opacity: isPending ? .6 : 1 }}>
                  Confirmar exclusão
                </button>
                <button onClick={() => onConfirmDelete(null)}
                  style={{ fontSize: 12, color: '#64748b', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  Cancelar
                </button>
              </div>
            ) : (
              <button onClick={() => onConfirmDelete(etapaId)}
                style={{ fontSize: 12, color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', marginRight: 'auto' }}>
                Excluir
              </button>
            )
          )}
          <button onClick={onClose}
            style={{ padding: '8px 16px', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', background: 'transparent', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={onSalvar} disabled={isPending || !form.nome.trim()}
            style={{ padding: '8px 20px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: isPending || !form.nome.trim() ? .6 : 1 }}>
            {isPending ? '...' : isEdit ? 'Salvar' : 'Criar etapa'}
          </button>
        </div>
      </div>
    </div>
  )
}
