'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { criarEtapa, atualizarEtapa, excluirEtapa, type EtapaPayload } from './actions'
import type { Etapa, PerfilGlobal } from '@/types/supabase'

// ─── Helpers de data ────────────────────────────────────────────────
function parseDate(s: string | null): Date | null {
  return s ? new Date(s + 'T00:00:00') : null
}

function toInput(d: Date | null): string {
  if (!d) return ''
  return d.toISOString().split('T')[0]
}

function diffDays(a: Date, b: Date) {
  return (b.getTime() - a.getTime()) / 86400000
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

// ─── Cálculo do range temporal do Gantt ─────────────────────────────
function calcRange(etapas: Etapa[], obraInicio: string | null, obraFim: string | null) {
  const dates: Date[] = []
  for (const e of etapas) {
    if (e.data_inicio_prev) dates.push(parseDate(e.data_inicio_prev)!)
    if (e.data_fim_prev) dates.push(parseDate(e.data_fim_prev)!)
    if (e.data_inicio_real) dates.push(parseDate(e.data_inicio_real)!)
    if (e.data_fim_real) dates.push(parseDate(e.data_fim_real)!)
  }
  if (obraInicio) dates.push(parseDate(obraInicio)!)
  if (obraFim) dates.push(parseDate(obraFim)!)

  if (dates.length === 0) {
    const hoje = new Date()
    dates.push(new Date(hoje.getFullYear(), hoje.getMonth(), 1))
    dates.push(new Date(hoje.getFullYear(), hoje.getMonth() + 4, 0))
  }

  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())))
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())))

  // Estende para início e fim de mês
  const start = startOfMonth(minDate)
  const end = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 1)

  return { start, end, totalDays: diffDays(start, end) }
}

// ─── Gera cabeçalhos de mês ─────────────────────────────────────────
function genMonths(start: Date, end: Date, totalDays: number) {
  const months: { label: string; pct: number }[] = []
  let cur = new Date(start)
  while (cur < end) {
    const mStart = Math.max(0, diffDays(start, cur))
    const next = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
    const mEnd = Math.min(totalDays, diffDays(start, next))
    months.push({
      label: cur.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      pct: ((mEnd - mStart) / totalDays) * 100,
    })
    cur = next
  }
  return months
}

// ─── Ordena etapas hierarquicamente ─────────────────────────────────
function sortEtapas(etapas: Etapa[]): Etapa[] {
  const roots = etapas.filter((e) => !e.etapa_pai_id).sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome))
  const result: Etapa[] = []
  for (const r of roots) {
    result.push(r)
    result.push(...etapas.filter((e) => e.etapa_pai_id === r.id).sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome)))
  }
  const inResult = new Set(result.map((e) => e.id))
  result.push(...etapas.filter((e) => !inResult.has(e.id)))
  return result
}

// ─── Posição CSS de uma barra ────────────────────────────────────────
function barPos(start: string | null, end: string | null, rangeStart: Date, totalDays: number) {
  const s = parseDate(start)
  const e = parseDate(end)
  if (!s || !e) return null
  const left = (diffDays(rangeStart, s) / totalDays) * 100
  const width = Math.max(0.3, (diffDays(s, e) / totalDays) * 100)
  return { left: `${left}%`, width: `${width}%` }
}

// ─── Formulário de etapa ─────────────────────────────────────────────
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

// ─── Componente principal ────────────────────────────────────────────
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
  const [modal, setModal] = useState<ModalState>(null)
  const [form, setForm] = useState<EtapaPayload>(EMPTY_FORM)
  const [msg, setMsg] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const podeEditar = perfil === 'admin' || perfil === 'engenheiro'

  const { start: rangeStart, end: rangeEnd, totalDays } = calcRange(etapas, obraDataInicio, obraDataFim)
  const months = genMonths(rangeStart, rangeEnd, totalDays)
  const sorted = sortEtapas(etapas)
  const roots = etapas.filter((e) => !e.etapa_pai_id)

  const hoje = new Date()
  const todayPct = totalDays > 0 ? (diffDays(rangeStart, hoje) / totalDays) * 100 : -1

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

  function closeModal() {
    setModal(null)
    setMsg('')
  }

  function handleFormChange(field: keyof EtapaPayload, value: string | number | null) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function handleSalvar() {
    startTransition(async () => {
      const payload = {
        ...form,
        data_inicio_prev: form.data_inicio_prev || null,
        data_fim_prev: form.data_fim_prev || null,
        data_inicio_real: form.data_inicio_real || null,
        data_fim_real: form.data_fim_real || null,
        etapa_pai_id: form.etapa_pai_id || null,
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

  // ─── Empty state ───────────────────────────────────────────────────
  if (etapas.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-4xl mb-3">📅</p>
        <p className="text-gray-500 mb-1">Nenhuma etapa cadastrada</p>
        <p className="text-sm text-gray-400 mb-6">Adicione etapas para visualizar o cronograma Gantt</p>
        {podeEditar && (
          <button onClick={openAdd} className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors">
            + Nova etapa
          </button>
        )}
        <Modal modal={modal} form={form} roots={roots} podeEditar={podeEditar} isPending={isPending} msg={msg} confirmDelete={confirmDelete}
          onClose={closeModal} onChange={handleFormChange} onSalvar={handleSalvar} onDelete={handleDelete} onConfirmDelete={setConfirmDelete} />
      </div>
    )
  }

  // ─── Gantt ─────────────────────────────────────────────────────────
  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Cronograma</h1>
          <p className="text-xs text-gray-400">{etapas.length} etapa{etapas.length !== 1 ? 's' : ''}</p>
        </div>
        {podeEditar && (
          <button onClick={openAdd} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors">
            + Nova etapa
          </button>
        )}
      </div>

      {/* Legenda */}
      <div className="flex gap-4 mb-3">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-8 h-2.5 rounded-full bg-gray-200 inline-block" /> Previsto
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-8 h-2.5 rounded-full bg-orange-400 inline-block" /> Real
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-px h-3 bg-red-400 inline-block" /> Hoje
        </div>
      </div>

      {/* Gantt table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ minWidth: '700px' }}>

            {/* Cabeçalho de meses */}
            <div className="flex border-b border-gray-200 bg-gray-50">
              {/* Coluna de nome (sticky) */}
              <div className="flex-shrink-0 w-52 sticky left-0 bg-gray-50 border-r border-gray-200 z-10" />
              {/* Meses */}
              <div className="flex-1 flex">
                {months.map((m, i) => (
                  <div
                    key={i}
                    className="text-center text-[10px] font-medium text-gray-400 uppercase tracking-wide py-2 border-r border-gray-100 last:border-r-0 truncate px-1"
                    style={{ width: `${m.pct}%` }}
                  >
                    {m.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Linhas de etapa */}
            {sorted.map((etapa) => {
              const isChild = !!etapa.etapa_pai_id
              const prevPos = barPos(etapa.data_inicio_prev, etapa.data_fim_prev, rangeStart, totalDays)
              const realPos = barPos(etapa.data_inicio_real, etapa.data_fim_real, rangeStart, totalDays)

              // Se não tem data real mas tem previsto, simula barra real com % do previsto
              let simRealPos: { left: string; width: string } | null = null
              if (!realPos && prevPos && etapa.percentual_real > 0) {
                const prevPct = parseFloat(prevPos.width)
                simRealPos = { left: prevPos.left, width: `${(prevPct * etapa.percentual_real) / 100}%` }
              }

              const barReal = realPos ?? simRealPos

              return (
                <div
                  key={etapa.id}
                  className={`flex border-b border-gray-100 last:border-b-0 group hover:bg-orange-50/30 transition-colors ${isChild ? 'bg-gray-50/50' : ''}`}
                >
                  {/* Coluna de nome (sticky) */}
                  <div className={`flex-shrink-0 w-52 sticky left-0 z-10 border-r border-gray-100 px-3 py-2.5 flex items-center justify-between gap-1 ${isChild ? 'bg-gray-50/80 pl-6' : 'bg-white'} group-hover:bg-orange-50/30`}>
                    <div className="min-w-0">
                      {isChild && <span className="text-gray-300 mr-1 text-xs">└</span>}
                      <span className="text-xs font-medium text-gray-700 truncate block">{etapa.nome}</span>
                      <span className="text-[10px] text-gray-400">{etapa.percentual_real}% real · {etapa.percentual_previsto}% prev.</span>
                    </div>
                    {podeEditar && (
                      <button
                        onClick={() => openEdit(etapa)}
                        className="flex-shrink-0 text-gray-300 hover:text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Editar etapa"
                      >
                        ✏️
                      </button>
                    )}
                  </div>

                  {/* Área Gantt */}
                  <div className="flex-1 relative" style={{ height: '52px' }}>
                    {/* Grade de meses */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {months.map((m, i) => (
                        <div key={i} className="h-full border-r border-gray-50 last:border-r-0" style={{ width: `${m.pct}%` }} />
                      ))}
                    </div>

                    {/* Linha de hoje */}
                    {todayPct >= 0 && todayPct <= 100 && (
                      <div
                        className="absolute top-0 bottom-0 w-px bg-red-300 z-10 pointer-events-none"
                        style={{ left: `${todayPct}%` }}
                      />
                    )}

                    {/* Barra previsto */}
                    {prevPos && (
                      <div
                        className="absolute rounded-full bg-gray-200"
                        style={{ ...prevPos, top: '14px', height: '8px' }}
                        title={`Previsto: ${etapa.data_inicio_prev} → ${etapa.data_fim_prev}`}
                      />
                    )}

                    {/* Barra real */}
                    {barReal && (
                      <div
                        className={`absolute rounded-full ${etapa.percentual_real >= 100 ? 'bg-green-500' : 'bg-orange-400'}`}
                        style={{ ...barReal, top: '28px', height: '8px' }}
                        title={`Real: ${etapa.data_inicio_real ?? '—'} → ${etapa.data_fim_real ?? '—'} (${etapa.percentual_real}%)`}
                      />
                    )}

                    {/* Sem datas */}
                    {!prevPos && !barReal && (
                      <div className="absolute inset-0 flex items-center px-3">
                        <span className="text-[10px] text-gray-300 italic">sem datas</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Modal */}
      <Modal
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

// ─── Modal de adição/edição ─────────────────────────────────────────
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

function Modal({ modal, form, roots, isPending, msg, confirmDelete, onClose, onChange, onSalvar, onDelete, onConfirmDelete }: ModalProps) {
  if (!modal) return null

  const isEdit = modal !== 'add'
  const etapaId = isEdit ? (modal as Etapa).id : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-900">
              {isEdit ? 'Editar etapa' : 'Nova etapa'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">Nome da etapa *</label>
              <input
                value={form.nome}
                onChange={(e) => onChange('nome', e.target.value)}
                className="input"
                placeholder="Ex: Fundação, Estrutura, Revestimento..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Etapa pai</label>
                <select
                  value={form.etapa_pai_id ?? ''}
                  onChange={(e) => onChange('etapa_pai_id', e.target.value || null)}
                  className="input"
                >
                  <option value="">— Etapa raiz</option>
                  {roots
                    .filter((r) => !isEdit || r.id !== etapaId)
                    .map((r) => (
                      <option key={r.id} value={r.id}>{r.nome}</option>
                    ))}
                </select>
              </div>
              <div>
                <label className="label">Ordem</label>
                <input
                  type="number"
                  min={0}
                  value={form.ordem}
                  onChange={(e) => onChange('ordem', Number(e.target.value))}
                  className="input"
                />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Datas previstas</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Início previsto</label>
                  <input
                    type="date"
                    value={form.data_inicio_prev ?? ''}
                    onChange={(e) => onChange('data_inicio_prev', e.target.value || null)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Fim previsto</label>
                  <input
                    type="date"
                    value={form.data_fim_prev ?? ''}
                    onChange={(e) => onChange('data_fim_prev', e.target.value || null)}
                    className="input"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Datas reais</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Início real</label>
                  <input
                    type="date"
                    value={form.data_inicio_real ?? ''}
                    onChange={(e) => onChange('data_inicio_real', e.target.value || null)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Fim real</label>
                  <input
                    type="date"
                    value={form.data_fim_real ?? ''}
                    onChange={(e) => onChange('data_fim_real', e.target.value || null)}
                    className="input"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">% Previsto</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.percentual_previsto}
                  onChange={(e) => onChange('percentual_previsto', Number(e.target.value))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">% Real</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.percentual_real}
                  onChange={(e) => onChange('percentual_real', Number(e.target.value))}
                  className="input"
                />
              </div>
            </div>

            {msg && <p className="text-sm text-red-600">{msg}</p>}
          </div>

          <div className="flex items-center gap-3 mt-6">
            {isEdit && etapaId && (
              confirmDelete === etapaId ? (
                <div className="flex gap-2 mr-auto">
                  <button
                    onClick={() => onDelete(etapaId)}
                    disabled={isPending}
                    className="text-xs px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-60"
                  >
                    Confirmar exclusão
                  </button>
                  <button onClick={() => onConfirmDelete(null)} className="text-xs text-gray-500 hover:text-gray-700">
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => onConfirmDelete(etapaId)}
                  className="text-xs text-red-400 hover:text-red-600 mr-auto"
                >
                  Excluir
                </button>
              )
            )}
            <button onClick={onClose} className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
            <button
              onClick={onSalvar}
              disabled={isPending || !form.nome.trim()}
              className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg disabled:opacity-60"
            >
              {isPending ? '...' : isEdit ? 'Salvar' : 'Criar etapa'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
