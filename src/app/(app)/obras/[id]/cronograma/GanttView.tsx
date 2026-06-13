'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { criarEtapa, atualizarEtapa, excluirEtapa, type EtapaPayload } from './actions'
import type { Etapa, PerfilGlobal } from '@/types/supabase'

// ─── helpers ─────────────────────────────────────────────────────────────────

function etapaToForm(e: Etapa): EtapaPayload {
  return {
    nome: e.nome, etapa_pai_id: e.etapa_pai_id,
    data_inicio_prev: e.data_inicio_prev, data_fim_prev: e.data_fim_prev,
    data_inicio_real: e.data_inicio_real, data_fim_real: e.data_fim_real,
    percentual_previsto: e.percentual_previsto, percentual_real: e.percentual_real, ordem: e.ordem,
  }
}

function sortedRoots(etapas: Etapa[]) {
  return etapas.filter((e) => !e.etapa_pai_id).sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome))
}

function childrenOf(etapas: Etapa[], pid: string) {
  return etapas.filter((e) => e.etapa_pai_id === pid).sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome))
}

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

function buildNumbers(etapas: Etapa[]): Map<string, string> {
  const map = new Map<string, string>()
  sortedRoots(etapas).forEach((r, i) => {
    map.set(r.id, String(i + 1))
    childrenOf(etapas, r.id).forEach((c, j) => map.set(c.id, `${i + 1}.${j + 1}`))
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
  const total       = etapas.length
  const naoIniciada = etapas.filter((e) => getStatus(e) === 'nao-iniciada').length
  const andamento   = etapas.filter((e) => getStatus(e) === 'andamento').length
  const concluida   = etapas.filter((e) => getStatus(e) === 'concluida').length
  const realizado   = total > 0 ? etapas.reduce((s, e) => s + e.percentual_real, 0) / total : 0
  return { total, naoIniciada, andamento, concluida, realizado }
}

function parentPct(etapas: Etapa[], id: string): number {
  const ch = childrenOf(etapas, id)
  if (ch.length === 0) return etapas.find((e) => e.id === id)?.percentual_real ?? 0
  return ch.reduce((s, c) => s + c.percentual_real, 0) / ch.length
}

// ─── progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ pct, isSelected }: { pct: number; isSelected: boolean }) {
  const color = pct >= 100 ? '#4cd965' : pct > 0 ? '#ff9500' : '#e5e7eb'
  const textColor = isSelected ? '#3b82f6' : '#4b5563'

  return (
    <div style={{ width: 150 }}>
      <div style={{ fontSize: 12, color: textColor, fontWeight: 500, marginBottom: 5 }}>
        {pct % 1 === 0 ? pct : pct.toFixed(2)}%
      </div>
      <div style={{ height: 6, borderRadius: 99, background: '#e9ecef', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, borderRadius: 99, background: color, transition: 'width .3s' }} />
      </div>
    </div>
  )
}

// ─── types ────────────────────────────────────────────────────────────────────

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

export default function GanttView({ obraId, etapas, perfil }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [modal,         setModal]         = useState<ModalState>(null)
  const [form,          setForm]          = useState<EtapaPayload>(EMPTY_FORM)
  const [msg,           setMsg]           = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [selected,      setSelected]      = useState<string | null>(null)

  const [etapasState, setEtapasState] = useState<Etapa[]>(etapas)
  useEffect(() => { setEtapasState(etapas) }, [etapas])

  const [showTop, setShowTop] = useState(false)
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 300)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const [search,            setSearch]            = useState('')
  const [filterStatus,      setFilterStatus]      = useState<FilterStatus>('todas')
  const [soEtapas,          setSoEtapas]          = useState(false)
  const [ocultarConcluidas, setOcultarConcluidas] = useState(false)

  const podeEditar = perfil === 'admin' || perfil === 'engenheiro'
  const sorted     = buildSorted(etapasState)
  const numbers    = buildNumbers(etapasState)
  const roots      = etapasState.filter((e) => !e.etapa_pai_id)
  const stats      = calcStats(etapasState)

  const filtered = useMemo(() => sorted.filter((e) => {
    if (search && !e.nome.toLowerCase().includes(search.toLowerCase())) return false
    if (soEtapas && !!e.etapa_pai_id) return false
    if (ocultarConcluidas && e.percentual_real >= 100) return false
    if (filterStatus !== 'todas' && getStatus(e) !== filterStatus) return false
    return true
  }), [sorted, search, soEtapas, ocultarConcluidas, filterStatus])

  // ── modal ────────────────────────────────────────────────────────────────
  function openAdd()         { setForm({ ...EMPTY_FORM, ordem: etapas.length }); setModal('add'); setMsg('') }
  function openEdit(e: Etapa){ setForm(etapaToForm(e)); setModal(e); setMsg('') }
  function closeModal()      { setModal(null); setMsg('') }
  function handleChange(f: keyof EtapaPayload, v: string | number | null) { setForm((p) => ({ ...p, [f]: v })) }

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

  function handleDelete(id: string) {
    startTransition(async () => {
      const res = await excluirEtapa(obraId, id)
      if (res?.error) { setMsg(res.error); return }
      setConfirmDelete(null); closeModal(); router.refresh()
    })
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ background: '#e5e7eb', minHeight: '100%', padding: '24px 28px 40px' }}>

      {/* Title */}
      <h1 style={{ margin: '0 0 20px', fontSize: 24, fontWeight: 500, color: '#374151' }}>
        Lista de tarefas
      </h1>

      {/* ── Filter bar ───────────────────────────────────────────── */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <input
          type="search"
          placeholder="Pesquisa"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: '1 1 220px', minWidth: 160, padding: '8px 14px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', color: '#111827', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
          style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontSize: 13, outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <option value="todas">Todas as tarefas</option>
          <option value="nao-iniciada">Não iniciadas</option>
          <option value="andamento">Em andamento</option>
          <option value="concluida">Concluídas</option>
        </select>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#4b5563', cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={soEtapas} onChange={(e) => setSoEtapas(e.target.checked)} style={{ width: 15, height: 15 }} />
            Exibir somente as etapas
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#4b5563', cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={ocultarConcluidas} onChange={(e) => setOcultarConcluidas(e.target.checked)} style={{ width: 15, height: 15 }} />
            Ocultar etapas concluídas
          </label>
        </div>

        <div style={{ display: 'flex', gap: 10, marginLeft: 'auto', alignItems: 'center' }}>
          {podeEditar && (
            <button onClick={openAdd}
              style={{ padding: '8px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              + Nova
            </button>
          )}
          <button
            onClick={() => window.print()}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 18px', background: '#475569', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Imprimir
          </button>
        </div>
      </div>

      {/* ── Stats cards ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Total',        value: stats.total },
          { label: 'Não iniciada', value: stats.naoIniciada },
          { label: 'Em andamento', value: stats.andamento },
          { label: 'Concluída',    value: stats.concluida },
          { label: 'Realizado',    value: `${stats.realizado.toFixed(2)}%` },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, padding: '20px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 30, fontWeight: 700, color: '#f15f23', lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 13, color: '#666', marginTop: 8 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Table ────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
        {etapasState.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#9ca3af' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
            <p style={{ fontSize: 14, marginBottom: 20 }}>Nenhuma atividade cadastrada</p>
            {podeEditar && (
              <button onClick={openAdd}
                style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                + Nova atividade
              </button>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9ca3af', fontSize: 13, fontStyle: 'italic' }}>
            Nenhuma atividade encontrada
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {filtered.map((etapa, idx) => {
                const isRoot   = !etapa.etapa_pai_id
                const num      = numbers.get(etapa.id) ?? ''
                const pct      = isRoot ? parentPct(etapasState, etapa.id) : etapa.percentual_real
                const isSel    = selected === etapa.id
                const isLast   = idx === filtered.length - 1

                return (
                  <tr
                    key={etapa.id}
                    onClick={() => setSelected(isSel ? null : etapa.id)}
                    style={{
                      background: isSel ? '#eff6ff' : isRoot ? '#f3f4f6' : '#fff',
                      borderBottom: isLast ? 'none' : '1px solid #eef0f2',
                      cursor: 'pointer',
                      transition: 'background .1s',
                    }}
                    onMouseEnter={(ev) => { if (!isSel) (ev.currentTarget as HTMLElement).style.background = isRoot ? '#e9ebee' : '#f9fafb' }}
                    onMouseLeave={(ev) => { (ev.currentTarget as HTMLElement).style.background = isSel ? '#eff6ff' : isRoot ? '#f3f4f6' : '#fff' }}
                  >
                    {/* # */}
                    <td style={{ padding: '12px 16px', width: 64, verticalAlign: 'middle' }}>
                      <span style={{
                        fontSize: isRoot ? 14 : 13,
                        fontWeight: isRoot ? 700 : 400,
                        color: isSel ? '#3b82f6' : isRoot ? '#111827' : '#9ca3af',
                      }}>
                        {num}
                      </span>
                    </td>

                    {/* Name */}
                    <td style={{ padding: '12px 8px', verticalAlign: 'middle' }}>
                      <span style={{
                        fontSize: isRoot ? 14 : 13,
                        fontWeight: isRoot ? 700 : 400,
                        color: isSel ? '#3b82f6' : isRoot ? '#111827' : '#374151',
                      }}>
                        {etapa.nome}
                      </span>
                    </td>

                    {/* Progress */}
                    <td style={{ padding: '12px 24px 12px 8px', width: 210, verticalAlign: 'middle' }}>
                      {isRoot ? (
                        pct > 0 ? (
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: isSel ? '#3b82f6' : '#374151' }}>
                              {pct % 1 === 0 ? pct : pct.toFixed(2)}%
                            </span>
                          </div>
                        ) : null
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <ProgressBar pct={pct} isSelected={isSel} />
                        </div>
                      )}
                    </td>

                    {/* Edit button (hover) */}
                    {podeEditar && (
                      <td style={{ padding: '12px 12px 12px 0', width: 36, verticalAlign: 'middle' }}>
                        <button
                          onClick={(ev) => { ev.stopPropagation(); openEdit(etapa) }}
                          title="Editar"
                          className="group-hover:opacity-100"
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14, color: '#9ca3af', opacity: isSel ? 1 : 0, transition: 'opacity .15s', display: 'flex', alignItems: 'center' }}
                          onMouseEnter={(ev) => { (ev.currentTarget as HTMLElement).style.opacity = '1' }}
                          onMouseLeave={(ev) => { if (!isSel) (ev.currentTarget as HTMLElement).style.opacity = '0' }}
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
        )}
      </div>

      {/* ── Scroll to top ─────────────────────────────────────────── */}
      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Voltar ao topo"
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 40,
            width: 48, height: 48, borderRadius: 10,
            background: '#fff', border: '1px solid #e5e7eb',
            boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#6b7280',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
        </button>
      )}

      {/* ── Modal ─────────────────────────────────────────────────── */}
      <EtapaModal
        modal={modal} form={form} roots={roots} podeEditar={podeEditar}
        isPending={isPending} msg={msg} confirmDelete={confirmDelete}
        onClose={closeModal} onChange={handleChange} onSalvar={handleSalvar}
        onDelete={handleDelete} onConfirmDelete={setConfirmDelete}
      />
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
    width: '100%', padding: '8px 10px', borderRadius: 6,
    background: '#f9fafb', border: '1px solid #d1d5db',
    color: '#111827', fontSize: 13, outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
  }
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280',
    marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
      <div style={{ position: 'relative', background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', padding: 24 }}
        onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>{isEdit ? 'Editar atividade' : 'Nova atividade'}</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
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

          <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 14 }}>
            <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em' }}>Datas planejadas</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={lbl}>Início</label><input type="date" value={form.data_inicio_prev ?? ''} onChange={(e) => onChange('data_inicio_prev', e.target.value || null)} style={inp} /></div>
              <div><label style={lbl}>Fim</label><input type="date" value={form.data_fim_prev ?? ''} onChange={(e) => onChange('data_fim_prev', e.target.value || null)} style={inp} /></div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 14 }}>
            <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em' }}>Datas reais</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={lbl}>Início</label><input type="date" value={form.data_inicio_real ?? ''} onChange={(e) => onChange('data_inicio_real', e.target.value || null)} style={inp} /></div>
              <div><label style={lbl}>Fim</label><input type="date" value={form.data_fim_real ?? ''} onChange={(e) => onChange('data_fim_real', e.target.value || null)} style={inp} /></div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={lbl}>% Planejado</label><input type="number" min={0} max={100} value={form.percentual_previsto} onChange={(e) => onChange('percentual_previsto', Number(e.target.value))} style={inp} /></div>
            <div><label style={lbl}>% Real</label><input type="number" min={0} max={100} value={form.percentual_real} onChange={(e) => onChange('percentual_real', Number(e.target.value))} style={inp} /></div>
          </div>

          {msg && (
            <div style={{ padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, fontSize: 13, color: '#dc2626' }}>{msg}</div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 22 }}>
          {isEdit && etapaId && (confirmDelete === etapaId ? (
            <div style={{ display: 'flex', gap: 8, marginRight: 'auto' }}>
              <button onClick={() => onDelete(etapaId)} disabled={isPending}
                style={{ fontSize: 12, padding: '6px 14px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', opacity: isPending ? .6 : 1 }}>
                Confirmar exclusão
              </button>
              <button onClick={() => onConfirmDelete(null)}
                style={{ fontSize: 12, color: '#6b7280', background: 'transparent', border: 'none', cursor: 'pointer' }}>Cancelar</button>
            </div>
          ) : (
            <button onClick={() => onConfirmDelete(etapaId)}
              style={{ fontSize: 12, color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', marginRight: 'auto' }}>Excluir</button>
          ))}
          <button onClick={onClose}
            style={{ padding: '8px 18px', border: '1px solid #d1d5db', color: '#374151', background: '#fff', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={onSalvar} disabled={isPending || !form.nome.trim()}
            style={{ padding: '8px 22px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: isPending || !form.nome.trim() ? .6 : 1 }}>
            {isPending ? '...' : isEdit ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  )
}
