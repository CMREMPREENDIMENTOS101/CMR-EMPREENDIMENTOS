'use client'

import { useMemo, useState } from 'react'

// ── Dados mockados ──────────────────────────────────────────────
const TASKS = [
  { id: '1',   name: 'Mobilização completa',                 type: 'section' },
  { id: '2',   name: 'Novos Estandes',                       type: 'group',   progress: 10.59 },
  { id: '2.1', name: 'Demolição estruturas/retiradas',       type: 'task',    progress: 100 },
  { id: '2.2', name: 'Fundação Completa',                    type: 'task',    progress: 40 },
  { id: '2.3', name: 'Superestrutura em concreto armado',    type: 'task',    progress: 40 },
  { id: '2.4', name: 'Fechamento em alvenaria convencional', type: 'task',    progress: 0 },
  { id: '2.5', name: 'Piso em concreto no pavimento térreo', type: 'task',    progress: 0 },
  { id: '2.6', name: 'Revestimento de paredes',              type: 'task',    progress: 0 },
  { id: '2.7', name: 'Revestimento de churrasqueiras',       type: 'task',    progress: 0 },
]

const SUMMARY = {
  total: 87,
  naoIniciada: 80,
  emAndamento: 6,
  concluida: 1,
  realizado: 5.14,
}

const fmtPct = (v) => (Number.isInteger(v) ? v : v.toFixed(2))

// ── Ícone impressora ────────────────────────────────────────────
function PrinterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  )
}

// ── Barra de progresso ──────────────────────────────────────────
function ProgressBar({ value }) {
  const fill = value >= 100 ? '#22C55E' : value > 0 ? '#F97316' : 'transparent'
  return (
    <div className="flex items-center justify-end gap-2">
      <span className="w-12 text-right text-sm tabular-nums text-gray-700">{fmtPct(value)}%</span>
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1.5 w-[120px] overflow-hidden rounded-full bg-[#E5E7EB]"
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(100, value)}%`, backgroundColor: fill }}
        />
      </div>
    </div>
  )
}

// ── Componente principal ────────────────────────────────────────
export default function TaskList() {
  const [search, setSearch]                       = useState('')
  const [status, setStatus]                       = useState('todas')
  const [soEtapas, setSoEtapas]                   = useState(false)
  const [ocultarConcluidas, setOcultarConcluidas] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()

    const taskPasses = (t) => {
      if (q && !t.name.toLowerCase().includes(q)) return false
      if (status === 'nao' && t.progress !== 0) return false
      if (status === 'andamento' && !(t.progress > 0 && t.progress < 100)) return false
      if (status === 'concluida' && t.progress !== 100) return false
      if (ocultarConcluidas && t.progress === 100) return false
      return true
    }

    // Subtarefas visíveis (ocultas por completo quando "somente etapas")
    const visibleTaskIds = new Set(
      soEtapas ? [] : TASKS.filter((t) => t.type === 'task' && taskPasses(t)).map((t) => t.id),
    )

    const hasVisibleChild = (g) =>
      TASKS.some((t) => t.type === 'task' && t.id.startsWith(`${g.id}.`) && visibleTaskIds.has(t.id))

    // Seções/grupos: aparecem se o nome casar ou se tiverem filhos visíveis
    const groupPasses = (g) => {
      if (ocultarConcluidas && g.progress === 100) return false
      if (soEtapas) return !q || g.name.toLowerCase().includes(q)
      if (status !== 'todas' && !hasVisibleChild(g)) return false
      if (q && !g.name.toLowerCase().includes(q) && !hasVisibleChild(g)) return false
      return true
    }

    return TASKS.filter((row) => (row.type === 'task' ? visibleTaskIds.has(row.id) : groupPasses(row)))
  }, [search, status, soEtapas, ocultarConcluidas])

  const cards = [
    { value: SUMMARY.total,           label: 'Total' },
    { value: SUMMARY.naoIniciada,     label: 'Não iniciada' },
    { value: SUMMARY.emAndamento,     label: 'Em andamento' },
    { value: SUMMARY.concluida,       label: 'Concluída' },
    { value: `${SUMMARY.realizado}%`, label: 'Realizado' },
  ]

  return (
    <div className="min-h-screen bg-[#F3F4F6] p-6">
      <h1 className="mb-6 text-[22px] font-semibold text-[#111827]">Lista de tarefas</h1>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">

        {/* ── Barra de filtros ─────────────────────────────────── */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          <input
            type="search"
            aria-label="Pesquisar tarefas"
            placeholder="Pesquisa"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-400 md:w-80"
          />

          <select
            aria-label="Filtrar por status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-400 md:w-44"
          >
            <option value="todas">Todas as tarefas</option>
            <option value="nao">Não iniciadas</option>
            <option value="andamento">Em andamento</option>
            <option value="concluida">Concluídas</option>
          </select>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="filtro-so-etapas" className="flex cursor-pointer items-center gap-2 text-[13px] text-[#6B7280]">
              <input
                id="filtro-so-etapas"
                type="checkbox"
                checked={soEtapas}
                onChange={(e) => setSoEtapas(e.target.checked)}
                className="h-4 w-4"
              />
              Exibir somente as etapas
            </label>
            <label htmlFor="filtro-ocultar-concluidas" className="flex cursor-pointer items-center gap-2 text-[13px] text-[#6B7280]">
              <input
                id="filtro-ocultar-concluidas"
                type="checkbox"
                checked={ocultarConcluidas}
                onChange={(e) => setOcultarConcluidas(e.target.checked)}
                className="h-4 w-4"
              />
              Ocultar etapas concluídas
            </label>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 rounded-md bg-[#374151] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1F2937] md:ml-auto"
          >
            <PrinterIcon />
            Imprimir
          </button>
        </div>

        {/* ── Cards de resumo ──────────────────────────────────── */}
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-5">
          {cards.map((c) => (
            <div key={c.label} className="rounded-md bg-[#F3F4F6] px-6 py-4 text-center">
              <div className="text-[32px] font-bold leading-none text-[#F97316]">{c.value}</div>
              <div className="mt-2 text-sm text-[#6B7280]">{c.label}</div>
            </div>
          ))}
        </div>

        {/* ── Tabela de tarefas ────────────────────────────────── */}
        <div className="mt-6 overflow-x-auto">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm italic text-gray-400">Nenhuma tarefa encontrada</p>
          ) : (
            <table className="w-full border-collapse">
              <tbody>
                {filtered.map((row) => {
                  const heading = row.type === 'section' || row.type === 'group'
                  const border  = row.type === 'group' ? 'border-t border-gray-300' : 'border-t border-gray-200'
                  return (
                    <tr key={row.id} className={border}>
                      <td className="w-16 px-2 py-3 align-middle">
                        <span className={`text-sm tabular-nums ${heading ? 'font-semibold text-[#111827]' : 'text-[#6B7280]'}`}>
                          {row.id}
                        </span>
                      </td>
                      <td className="px-2 py-3 align-middle">
                        <span className={`text-sm ${heading ? 'font-semibold text-[#111827]' : 'text-gray-700'}`}>
                          {row.name}
                        </span>
                      </td>
                      <td className="w-[200px] px-4 py-3 align-middle">
                        {row.type === 'task' && <ProgressBar value={row.progress} />}
                        {row.type === 'group' && (
                          <div className="text-right">
                            <span className="text-sm font-semibold tabular-nums text-[#111827]">{fmtPct(row.progress)}%</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
