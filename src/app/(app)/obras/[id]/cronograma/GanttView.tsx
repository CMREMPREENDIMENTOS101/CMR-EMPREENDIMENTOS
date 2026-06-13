'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { criarEtapa, atualizarEtapa, excluirEtapa, type EtapaPayload } from './actions'
import type { Etapa, PerfilGlobal } from '@/types/supabase'

// ─── helpers ─────────────────────────────────────────────────────────────────

function parseDate(s: string | null): Date | null {
  return s ? new Date(s + 'T00:00:00') : null
}

function diffDays(a: Date, b: Date) {
  return (b.getTime() - a.getTime()) / 86_400_000
}

function calcRange(etapas: Etapa[], obraInicio: string | null, obraFim: string | null) {
  const dates: Date[] = []
  for (const e of etapas) {
    if (e.data_inicio_prev) dates.push(parseDate(e.data_inicio_prev)!)
    if (e.data_fim_prev)    dates.push(parseDate(e.data_fim_prev)!)
    if (e.data_inicio_real) dates.push(parseDate(e.data_inicio_real)!)
    if (e.data_fim_real)    dates.push(parseDate(e.data_fim_real)!)
  }
  if (obraInicio) dates.push(parseDate(obraInicio)!)
  if (obraFim)    dates.push(parseDate(obraFim)!)

  if (dates.length === 0) {
    const hoje = new Date()
    dates.push(new Date(hoje.getFullYear(), hoje.getMonth(), 1))
    dates.push(new Date(hoje.getFullYear(), hoje.getMonth() + 4, 0))
  }

  const min = new Date(Math.min(...dates.map((d) => d.getTime())))
  const max = new Date(Math.max(...dates.map((d) => d.getTime())))
  const start = new Date(min.getFullYear(), min.getMonth(), 1)
  const end   = new Date(max.getFullYear(), max.getMonth() + 1, 1)
  return { start, end, totalDays: diffDays(start, end) }
}

function genMonths(start: Date, end: Date, totalDays: number) {
  const months: { label: string; pct: number }[] = []
  let cur = new Date(start)
  while (cur < end) {
    const mStart = Math.max(0, diffDays(start, cur))
    const next   = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
    const mEnd   = Math.min(totalDays, diffDays(start, next))
    months.push({
      label: cur.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      pct: ((mEnd - mStart) / totalDays) * 100,
    })
    cur = next
  }
  return months
}

function sortEtapas(etapas: Etapa[]): Etapa[] {
  const roots  = etapas.filter((e) => !e.etapa_pai_id).sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome))
  const result: Etapa[] = []
  for (const r of roots) {
    result.push(r)
    result.push(...etapas.filter((e) => e.etapa_pai_id === r.id).sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome)))
  }
  const seen = new Set(result.map((e) => e.id))
  result.push(...etapas.filter((e) => !seen.has(e.id)))
  return result
}

function barPos(start: string | null, end: string | null, rangeStart: Date, totalDays: number) {
  const s = parseDate(start)
  const e = parseDate(end)
  if (!s || !e) return null
  const left  = (diffDays(rangeStart, s) / totalDays) * 100
  const width = Math.max(0.3, (diffDays(s, e) / totalDays) * 100)
  return { left: `${left}%`, width: `${width}%` }
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

// ─── column widths ────────────────────────────────────────────────────────────

const NAME_W  = 156   // px — etapa name
const DATE_W  = 110   // px — each date column
const STICKY_W = NAME_W + DATE_W * 2   // 376 px

// ─── component ───────────────────────────────────────────────────────────────

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
  const [modal, setModal]             = useState<ModalState>(null)
  const [form,  setForm]              = useState<EtapaPayload>(EMPTY_FORM)
  const [msg,   setMsg]               = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // Optimistic local state — synced from server after modal saves
  const [etapasState, setEtapasState] = useState<Etapa[]>(etapas)

  useEffect(() => { setEtapasState(etapas) }, [etapas])

  const podeEditar = perfil === 'admin' || perfil === 'engenheiro'

  const { start: rangeStart, end: rangeEnd, totalDays } = calcRange(etapasState, obraDataInicio, obraDataFim)
  const months = genMonths(rangeStart, rangeEnd, totalDays)
  const sorted = sortEtapas(etapasState)
  const roots  = etapasState.filter((e) => !e.etapa_pai_id)

  const hoje     = new Date()
  const todayPct = totalDays > 0 ? (diffDays(rangeStart, hoje) / totalDays) * 100 : -1

  // ── inline date editing ──────────────────────────────────────────────────
  function handleDateChange(etapaId: string, field: DateField, value: string) {
    setEtapasState((prev) =>
      prev.map((e) => e.id === etapaId ? { ...e, [field]: value || null } : e)
    )
  }

  function handleDateBlur(etapaId: string, field: DateField, value: string) {
    // Save just the changed field to server — fire and forget
    atualizarEtapa(obraId, etapaId, { [field]: value || null }).catch(() => {})
  }

  // ── modal ────────────────────────────────────────────────────────────────
  function openAdd() {
    setForm({ ...EMPTY_FORM, ordem: etapas.length })
    setModal('add')
    setMsg('')
  }

  function openEdit(e: Etapa) {
    setForm(etapaToForm(e))
    setModal(e)
    setMsg('')
  }

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

  // ── empty state ──────────────────────────────────────────────────────────
  if (etapasState.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-4xl mb-3">📅</p>
        <p className="text-gray-500 mb-1">Nenhuma etapa cadastrada</p>
        <p className="text-sm text-gray-400 mb-6">Adicione etapas para visualizar o cronograma Gantt</p>
        {podeEditar && (
          <button onClick={openAdd}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors">
            + Nova etapa
          </button>
        )}
        <EtapaModal modal={modal} form={form} roots={roots} podeEditar={podeEditar} isPending={isPending}
          msg={msg} confirmDelete={confirmDelete}
          onClose={closeModal} onChange={handleFormChange} onSalvar={handleSalvar}
          onDelete={handleDelete} onConfirmDelete={setConfirmDelete} />
      </div>
    )
  }

  // ── date input style ──────────────────────────────────────────────────────
  const dateInput: React.CSSProperties = {
    width: '100%',
    border: 'none',
    background: 'transparent',
    fontSize: 11,
    color: '#374151',
    outline: 'none',
    cursor: podeEditar ? 'text' : 'default',
    padding: '2px 0',
    fontFamily: 'inherit',
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold" style={{ color: '#f1f5f9' }}>Cronograma</h1>
          <p className="text-xs" style={{ color: '#64748b' }}>
            {etapasState.length} etapa{etapasState.length !== 1 ? 's' : ''}
          </p>
        </div>
        {podeEditar && (
          <button onClick={openAdd}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors">
            + Nova etapa
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-3">
        {[
          { color: 'rgba(255,255,255,0.15)', label: 'Previsto' },
          { color: '#dc2626', label: 'Real' },
          { color: '#f87171', label: 'Hoje', isLine: true },
        ].map(({ color, label, isLine }) => (
          <div key={label} className="flex items-center gap-1.5" style={{ fontSize: 11, color: '#64748b' }}>
            {isLine
              ? <span style={{ width: 1, height: 12, background: color, display: 'inline-block' }} />
              : <span style={{ width: 28, height: 8, borderRadius: 99, background: color, display: 'inline-block' }} />
            }
            {label}
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: STICKY_W + 500 }}>

            {/* Column header row */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', background: '#0f172a' }}>
              {/* Sticky header */}
              <div style={{ flexShrink: 0, position: 'sticky', left: 0, background: '#0f172a', zIndex: 10, display: 'flex', borderRight: '1px solid rgba(255,255,255,0.08)', width: STICKY_W }}>
                <div style={{ width: NAME_W, padding: '8px 12px', fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.06em', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                  Etapa
                </div>
                <div style={{ width: DATE_W, padding: '8px 8px', fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                  Início prev.
                </div>
                <div style={{ width: DATE_W, padding: '8px 8px', fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'center' }}>
                  Fim prev.
                </div>
              </div>
              {/* Month headers */}
              <div style={{ flex: 1, display: 'flex' }}>
                {months.map((m, i) => (
                  <div key={i}
                    style={{ width: `${m.pct}%`, textAlign: 'center', fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '.06em', padding: '8px 4px', borderRight: i < months.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {m.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Data rows */}
            {sorted.map((etapa) => {
              const isChild = !!etapa.etapa_pai_id
              const prevPos = barPos(etapa.data_inicio_prev, etapa.data_fim_prev, rangeStart, totalDays)
              const realPos = barPos(etapa.data_inicio_real, etapa.data_fim_real, rangeStart, totalDays)

              let simRealPos: { left: string; width: string } | null = null
              if (!realPos && prevPos && etapa.percentual_real > 0) {
                const pw = parseFloat(prevPos.width)
                simRealPos = { left: prevPos.left, width: `${(pw * etapa.percentual_real) / 100}%` }
              }
              const barReal = realPos ?? simRealPos

              return (
                <div key={etapa.id}
                  className="group"
                  style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>

                  {/* Sticky left: name + date inputs */}
                  <div
                    style={{
                      flexShrink: 0, position: 'sticky', left: 0, zIndex: 10,
                      display: 'flex', width: STICKY_W,
                      borderRight: '1px solid rgba(255,255,255,0.06)',
                      background: isChild ? '#162032' : '#1e293b',
                    }}
                  >
                    {/* Name */}
                    <div style={{ width: NAME_W, padding: isChild ? '10px 12px 10px 24px' : '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, borderRight: '1px solid rgba(255,255,255,0.05)', minWidth: 0 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        {isChild && <span style={{ color: 'rgba(255,255,255,0.2)', marginRight: 4, fontSize: 11 }}>└</span>}
                        <span style={{ fontSize: 12, fontWeight: 500, color: '#e2e8f0', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {etapa.nome}
                        </span>
                        <span style={{ fontSize: 10, color: '#475569' }}>
                          {etapa.percentual_real}% real · {etapa.percentual_previsto}% prev.
                        </span>
                      </div>
                      {podeEditar && (
                        <button
                          onClick={() => openEdit(etapa)}
                          title="Editar etapa"
                          style={{ flexShrink: 0, fontSize: 12, background: 'transparent', border: 'none', cursor: 'pointer', color: '#475569', opacity: 0, transition: 'opacity .15s' }}
                          className="group-hover:!opacity-100"
                        >
                          ✏️
                        </button>
                      )}
                    </div>

                    {/* Início Prev */}
                    <div style={{ width: DATE_W, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                      <input
                        type="date"
                        value={etapa.data_inicio_prev ?? ''}
                        disabled={!podeEditar}
                        onChange={(ev) => handleDateChange(etapa.id, 'data_inicio_prev', ev.target.value)}
                        onBlur={(ev)   => handleDateBlur(etapa.id, 'data_inicio_prev', ev.target.value)}
                        style={{
                          ...dateInput,
                          colorScheme: 'dark',
                          color: etapa.data_inicio_prev ? '#cbd5e1' : '#334155',
                        }}
                      />
                    </div>

                    {/* Fim Prev */}
                    <div style={{ width: DATE_W, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px' }}>
                      <input
                        type="date"
                        value={etapa.data_fim_prev ?? ''}
                        disabled={!podeEditar}
                        onChange={(ev) => handleDateChange(etapa.id, 'data_fim_prev', ev.target.value)}
                        onBlur={(ev)   => handleDateBlur(etapa.id, 'data_fim_prev', ev.target.value)}
                        style={{
                          ...dateInput,
                          colorScheme: 'dark',
                          color: etapa.data_fim_prev ? '#cbd5e1' : '#334155',
                        }}
                      />
                    </div>
                  </div>

                  {/* Gantt bars area */}
                  <div style={{ flex: 1, position: 'relative', height: 56 }}>
                    {/* Month grid */}
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', pointerEvents: 'none' }}>
                      {months.map((m, i) => (
                        <div key={i} style={{ width: `${m.pct}%`, height: '100%', borderRight: i < months.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }} />
                      ))}
                    </div>

                    {/* Today line */}
                    {todayPct >= 0 && todayPct <= 100 && (
                      <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${todayPct}%`, width: 1, background: '#f87171', opacity: .6, zIndex: 5, pointerEvents: 'none' }} />
                    )}

                    {/* Previsto bar */}
                    {prevPos && (
                      <div
                        style={{ position: 'absolute', ...prevPos, top: 14, height: 10, borderRadius: 99, background: 'rgba(255,255,255,0.13)' }}
                        title={`Previsto: ${etapa.data_inicio_prev ?? '—'} → ${etapa.data_fim_prev ?? '—'}`}
                      />
                    )}

                    {/* Real bar */}
                    {barReal && (
                      <div
                        style={{
                          position: 'absolute', ...barReal, top: 30, height: 10, borderRadius: 99,
                          background: etapa.percentual_real >= 100 ? '#22c55e' : '#dc2626',
                        }}
                        title={`Real: ${etapa.data_inicio_real ?? '—'} → ${etapa.data_fim_real ?? '—'} (${etapa.percentual_real}%)`}
                      />
                    )}

                    {!prevPos && !barReal && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', paddingLeft: 12 }}>
                        <span style={{ fontSize: 10, color: '#334155', fontStyle: 'italic' }}>sem datas</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <EtapaModal
        modal={modal}
        form={form}
        roots={roots}
        podeEditar={podeEditar}
        isPending={isPending}
        msg={msg}
        confirmDelete={confirmDelete}
        onClose={closeModal}
        onChange={handleFormChange}
        onSalvar={handleSalvar}
        onDelete={handleDelete}
        onConfirmDelete={setConfirmDelete}
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

  const isEdit   = modal !== 'add'
  const etapaId  = isEdit ? (modal as Etapa).id : null

  const inp: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 8,
    background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
    color: '#e2e8f0', fontSize: 13, outline: 'none',
    boxSizing: 'border-box', colorScheme: 'dark', fontFamily: 'inherit',
  }
  const lbl: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
      <div
        style={{ position: 'relative', background: '#1e293b', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto', padding: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>
            {isEdit ? 'Editar etapa' : 'Nova etapa'}
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
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
            <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.06em' }}>Datas previstas</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>Início previsto</label>
                <input type="date" value={form.data_inicio_prev ?? ''} onChange={(e) => onChange('data_inicio_prev', e.target.value || null)} style={inp} />
              </div>
              <div>
                <label style={lbl}>Fim previsto</label>
                <input type="date" value={form.data_fim_prev ?? ''} onChange={(e) => onChange('data_fim_prev', e.target.value || null)} style={inp} />
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 16 }}>
            <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.06em' }}>Datas reais</p>
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
              <label style={lbl}>% Previsto</label>
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
