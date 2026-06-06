'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import RelatorioSection from './RelatorioSection'
import type { ReportData } from './RelatorioPDF'

// ─── Tipos ───────────────────────────────────────────────────────────────────
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

// ─── Config de status ────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; bg: string; dot: string }> = {
  rascunho: {
    label: 'Preenchendo relatório',
    bg: 'bg-orange-100 text-orange-700',
    dot: 'bg-orange-400',
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

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtBR(s: string) {
  return new Date(s + 'T00:00:00').toLocaleDateString('pt-BR')
}

// ─── Ícones SVG ──────────────────────────────────────────────────────────────
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

// ─── Componente principal ────────────────────────────────────────────────────
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

  // ── Filtragem e ordenação ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = [...diarios]

    if (statusFilter !== 'todos') {
      result = result.filter((d) => d.status === statusFilter)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (d) =>
          fmtBR(d.data).includes(q) ||
          String(d.numero).includes(q),
      )
    }

    result.sort((a, b) =>
      sort === 'desc'
        ? b.data.localeCompare(a.data)
        : a.data.localeCompare(b.data),
    )

    return result
  }, [diarios, statusFilter, search, sort])

  // ── Estatísticas ─────────────────────────────────────────────────────────
  const total = diarios.length
  const nAprovados = diarios.filter((d) => d.status === 'aprovado').length
  const nPreenchidos = diarios.filter((d) => d.status === 'preenchido').length
  const nRascunho = diarios.filter((d) => d.status === 'rascunho').length

  return (
    <div className="space-y-4">
      {/* ── Cabeçalho ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Relatórios{' '}
            <span className="text-base font-normal text-gray-400">({total})</span>
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
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
        >
          <IconPrint />
          Gerar PDF consolidado
        </button>
      </div>

      {/* ── Painel PDF consolidado ─────────────────────────────────────────── */}
      {showPDF && (
        <div className="bg-white rounded-xl border border-orange-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-orange-50 border-b border-orange-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-orange-800">
              Gerar relatório PDF consolidado
            </h2>
            <button
              onClick={() => setShowPDF(false)}
              className="text-orange-400 hover:text-orange-600 text-lg leading-none"
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
                className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
              >
                Gerar
              </button>
            </form>
            <p className="text-xs text-gray-400 mt-2">
              Apenas diários com status{' '}
              <strong>preenchido</strong> ou <strong>aprovado</strong> são incluídos.
            </p>

            {/* Download se dados disponíveis */}
            {reportData && (
              <RelatorioSection data={reportData} filename={filename} />
            )}
          </div>
        </div>
      )}

      {/* ── Barra de filtros ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {/* Linha 1 */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-100">
          {/* Status */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none text-sm border border-gray-200 rounded-lg pl-3 pr-8 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 cursor-pointer font-medium text-gray-700"
            >
              <option value="todos">Todos os relatórios</option>
              <option value="rascunho">Preenchendo</option>
              <option value="preenchido">Aguardando revisão</option>
              <option value="aprovado">Aprovado</option>
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
              <IconChevron />
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              max={hoje}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 text-gray-600"
            />
            <span className="text-sm text-gray-400">até</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              max={hoje}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 text-gray-600"
            />
            <button
              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              onClick={() => setShowPDF(true)}
              title="Gerar PDF para o período"
              type="button"
            >
              <IconSearch />
            </button>
          </div>
        </div>

        {/* Linha 2 */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          {/* Pesquisa */}
          <div className="relative flex-1 min-w-[160px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <IconSearch />
            </span>
            <input
              type="text"
              placeholder="Pesquisar data ou número..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg pl-9 pr-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 placeholder-gray-400"
            />
          </div>

          {/* Modelo (estático) */}
          <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 bg-white">
            <IconDoc />
            <span>RDO - CMR</span>
          </div>

          {/* Ordenação */}
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as 'asc' | 'desc')}
              className="appearance-none text-sm border border-gray-200 rounded-lg pl-3 pr-8 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 cursor-pointer text-gray-600"
            >
              <option value="desc">Ordem decrescente</option>
              <option value="asc">Ordem crescente</option>
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
              <IconChevron />
            </span>
          </div>

          {/* Imprimir */}
          <button
            type="button"
            onClick={() => setShowPDF((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <IconPrint />
            Imprimir
          </button>
        </div>

        {/* ── Tabela ─────────────────────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="px-5 py-14 text-center border-t border-gray-100">
            <p className="text-sm text-gray-400">
              Nenhum diário encontrado com os filtros selecionados.
            </p>
          </div>
        ) : (
          <div className="border-t border-gray-100">
            {/* Cabeçalho da tabela */}
            <div className="hidden sm:grid sm:grid-cols-[130px_56px_1fr_130px_72px_80px] gap-x-4 px-5 py-2.5 bg-gray-50 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Data
              </span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Nº
              </span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Status
              </span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Modelo
              </span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Fotos
              </span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">
                Ações
              </span>
            </div>

            {/* Linhas */}
            <ul className="divide-y divide-gray-50">
              {filtered.map((d) => {
                const st = STATUS_MAP[d.status] ?? STATUS_MAP.rascunho
                return (
                  <li
                    key={d.id}
                    className="group flex flex-col sm:grid sm:grid-cols-[130px_56px_1fr_130px_72px_80px] sm:items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-gray-50 transition-colors"
                  >
                    {/* Data */}
                    <Link
                      href={`/obras/${obraId}/diario/${d.data}`}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium tabular-nums"
                    >
                      {fmtBR(d.data)}
                    </Link>

                    {/* Nº */}
                    <span className="text-sm font-bold text-blue-600">
                      {d.numero}
                    </span>

                    {/* Status */}
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold w-fit ${st.bg}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${st.dot}`} />
                      {st.label}
                    </span>

                    {/* Modelo */}
                    <span className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500">
                      <IconDoc />
                      RDO - CMR
                    </span>

                    {/* Fotos */}
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      {d.fotos > 0 ? (
                        <>
                          <IconCamera />
                          <span className="font-medium">{d.fotos}</span>
                        </>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </span>

                    {/* Ações */}
                    <div className="flex items-center gap-1 sm:justify-end">
                      <Link
                        href={`/obras/${obraId}/relatorios?de=${d.data}&ate=${d.data}`}
                        title="Imprimir RDO deste dia"
                        className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <IconPrint />
                      </Link>
                      <Link
                        href={`/obras/${obraId}/diario/${d.data}`}
                        title="Editar diário"
                        className="p-2 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                      >
                        <IconEdit />
                      </Link>
                    </div>
                  </li>
                )
              })}
            </ul>

            {/* Rodapé */}
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Mostrando <strong>{filtered.length}</strong> de{' '}
                <strong>{total}</strong> relatórios
              </p>
              <Link
                href={`/obras/${obraId}/diario`}
                className="text-xs text-orange-500 hover:text-orange-700 font-medium"
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
