'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import RelatorioSection from './RelatorioSection'
import type { ReportData } from './RelatorioPDF'

type DiarioItem = {
  id: string
  data: string
  status: string
  numero: number
  fotos: number
}

type Props = {
  obraId: string
  diarios: DiarioItem[]
  reportData: ReportData | null
  hoje: string
  deDefault: string
  ateDefault: string
  filename: string
}

const STATUS_MAP: Record<string, { label: string; bg: string; dot: string }> = {
  rascunho: {
    label: 'Preenchendo relatório',
    bg: 'bg-red-100 text-red-700',
    dot: 'bg-red-500',
  },
  preenchido: {
    label: 'Aguardando revisão',
    bg: 'bg-yellow-100 text-yellow-700',
    dot: 'bg-yellow-400',
  },
  aprovado: {
    label: 'Aprovado',
    bg: 'bg-green-100 text-green-700',
    dot: 'bg-green-500',
  },
}

function fmtBR(s: string) {
  return new Date(s + 'T00:00:00').toLocaleDateString('pt-BR')
}

function IconPrint() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
    </svg>
  )
}

function IconEdit() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  )
}

function IconCamera() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
}

function IconChevron() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function IconDoc() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

export default function RelatorioListClient({
  obraId,
  diarios,
  reportData,
  hoje,
  deDefault,
  ateDefault,
  filename,
}: Props) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [sort, setSort] = useState<'desc' | 'asc'>('desc')
  const [dateFrom, setDateFrom] = useState(deDefault)
  const [dateTo, setDateTo] = useState(ateDefault)
  const [showPDF, setShowPDF] = useState(reportData !== null)

  const filtered = useMemo(() => {
    let result = [...diarios]
    if (statusFilter !== 'todos') result = result.filter((d) => d.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((d) => fmtBR(d.data).includes(q) || String(d.numero).includes(q))
    }
    result.sort((a, b) => sort === 'desc' ? b.data.localeCompare(a.data) : a.data.localeCompare(b.data))
    return result
  }, [diarios, statusFilter, search, sort])

  const total = diarios.length
  const nAprovados = diarios.filter((d) => d.status === 'aprovado').length
  const nPreenchidos = diarios.filter((d) => d.status === 'preenchido').length
  const nRascunho = diarios.filter((d) => d.status === 'rascunho').length

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#f1f5f9' }}>
            Relatórios{' '}
            <span className="text-base font-normal" style={{ color: '#64748b' }}>({total})</span>
          </h1>
          <div className="flex flex-wrap gap-2 mt-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
              {nRascunho} preenchendo
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />
              {nPreenchidos} aguardando revisão
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              {nAprovados} aprovados
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowPDF((v) => !v)}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
        >
          <IconPrint />
          Gerar PDF consolidado
        </button>
      </div>

      {/* Painel PDF */}
      {showPDF && (
        <div className="rounded-xl overflow-hidden" style={{ background: '#1e293b', border: '1px solid rgba(220,38,38,0.25)' }}>
          <div className="px-5 py-3 flex items-center justify-between" style={{ background: 'rgba(220,38,38,0.1)', borderBottom: '1px solid rgba(220,38,38,0.15)' }}>
            <h2 className="text-sm font-semibold" style={{ color: '#fca5a5' }}>
              Gerar relatório PDF consolidado
            </h2>
            <button
              onClick={() => setShowPDF(false)}
              className="text-lg leading-none"
              style={{ color: '#f87171' }}
            >
              ×
            </button>
          </div>

          <div className="p-5">
            <form method="GET" className="flex flex-col sm:flex-row items-end gap-3">
              <div className="flex-1">
                <label className="label">Data inicial</label>
                <input
                  type="date"
                  name="de"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  max={hoje}
                  className="input"
                  required
                />
              </div>
              <div className="flex-1">
                <label className="label">Data final</label>
                <input
                  type="date"
                  name="ate"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  max={hoje}
                  className="input"
                  required
                />
              </div>
              <button
                type="submit"
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
              >
                Gerar
              </button>
            </form>
            <p className="text-xs text-gray-400 mt-2">
              Apenas diários com status <strong>preenchido</strong> ou <strong>aprovado</strong> são incluídos.
            </p>
            {reportData && (
              <RelatorioSection data={reportData} filename={filename} />
            )}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.07)' }}>
        {/* Filtros linha 1 */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none text-sm rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-red-400 cursor-pointer font-medium"
              style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1' }}
            >
              <option value="todos">Todos os relatórios</option>
              <option value="rascunho">Preenchendo</option>
              <option value="preenchido">Aguardando revisão</option>
              <option value="aprovado">Aprovado</option>
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" style={{ color: '#475569' }}>
              <IconChevron />
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              max={hoje}
              className="text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400"
              style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1' }}
            />
            <span className="text-sm" style={{ color: '#475569' }}>até</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              max={hoje}
              className="text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400"
              style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1' }}
            />
            <button
              className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              onClick={() => setShowPDF(true)}
              title="Gerar PDF para o período"
              type="button"
            >
              <IconSearch />
            </button>
          </div>
        </div>

        {/* Filtros linha 2 */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="relative flex-1 min-w-[160px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#475569' }}>
              <IconSearch />
            </span>
            <input
              type="text"
              placeholder="Pesquisar data ou número..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-sm rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400"
              style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
            />
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ border: '1px solid rgba(255,255,255,0.07)', color: '#64748b' }}>
            <IconDoc />
            <span>RDO - CMR</span>
          </div>

          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as 'asc' | 'desc')}
              className="appearance-none text-sm rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-red-400 cursor-pointer"
              style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1' }}
            >
              <option value="desc">Ordem decrescente</option>
              <option value="asc">Ordem crescente</option>
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" style={{ color: '#475569' }}>
              <IconChevron />
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowPDF((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 text-white text-sm font-semibold rounded-lg transition-colors"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <IconPrint />
            Imprimir
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <p className="text-sm" style={{ color: '#475569' }}>Nenhum diário encontrado com os filtros selecionados.</p>
          </div>
        ) : (
          <div>
            {/* Cabeçalho da tabela */}
            <div className="hidden sm:grid sm:grid-cols-[130px_56px_1fr_130px_72px_80px] gap-x-4 px-5 py-2.5" style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#475569' }}>Data</span>
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#475569' }}>Nº</span>
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#475569' }}>Status</span>
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#475569' }}>Modelo</span>
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#475569' }}>Fotos</span>
              <span className="text-xs font-semibold uppercase tracking-wide text-right" style={{ color: '#475569' }}>Ações</span>
            </div>

            <ul className="divide-y divide-white/5">
              {filtered.map((d) => {
                const st = STATUS_MAP[d.status] ?? STATUS_MAP.rascunho
                return (
                  <li
                    key={d.id}
                    className="group flex flex-col sm:grid sm:grid-cols-[130px_56px_1fr_130px_72px_80px] sm:items-center gap-x-4 gap-y-1 px-5 py-3 transition-colors hover:bg-white/5"
                  >
                    <Link
                      href={`/obras/${obraId}/diario/${d.data}`}
                      className="text-sm font-medium tabular-nums"
                      style={{ color: '#94a3b8' }}
                    >
                      {fmtBR(d.data)}
                    </Link>
                    <span className="text-sm font-bold" style={{ color: '#64748b' }}>{d.numero}</span>
                    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold w-fit ${st.bg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${st.dot}`} />
                      {st.label}
                    </span>
                    <span className="hidden sm:flex items-center gap-1.5 text-xs" style={{ color: '#475569' }}>
                      <IconDoc />
                      RDO - CMR
                    </span>
                    <span className="text-xs flex items-center gap-1" style={{ color: '#64748b' }}>
                      {d.fotos > 0 ? (
                        <><IconCamera /><span className="font-medium">{d.fotos}</span></>
                      ) : (
                        <span style={{ color: '#334155' }}>—</span>
                      )}
                    </span>
                    <div className="flex items-center gap-1 sm:justify-end">
                      <Link
                        href={`/obras/${obraId}/relatorios?de=${d.data}&ate=${d.data}`}
                        title="Imprimir RDO deste dia"
                        className="p-2 rounded-lg transition-colors hover:bg-white/10"
                        style={{ color: '#475569' }}
                      >
                        <IconPrint />
                      </Link>
                      <Link
                        href={`/obras/${obraId}/diario/${d.data}`}
                        title="Editar diário"
                        className="p-2 rounded-lg transition-colors hover:bg-red-900/30 hover:text-red-400"
                        style={{ color: '#475569' }}
                      >
                        <IconEdit />
                      </Link>
                    </div>
                  </li>
                )
              })}
            </ul>

            <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
              <p className="text-xs" style={{ color: '#475569' }}>
                Mostrando <strong>{filtered.length}</strong> de <strong>{total}</strong> relatórios
              </p>
              <Link
                href={`/obras/${obraId}/diario`}
                className="text-xs text-red-500 hover:text-red-400 font-medium"
              >
                + Registrar novo diário
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
