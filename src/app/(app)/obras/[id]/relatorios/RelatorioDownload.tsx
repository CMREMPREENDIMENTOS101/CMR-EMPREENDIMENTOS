'use client'

import { PDFDownloadLink } from '@react-pdf/renderer'
import RelatorioPDF, { type ReportData } from './RelatorioPDF'

interface Props {
  data: ReportData
  filename: string
}

export default function RelatorioDownload({ data, filename }: Props) {
  if (data.diarios.length === 0) {
    return (
      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
        Nenhum diário aprovado ou preenchido encontrado no período selecionado.
      </div>
    )
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-xl p-5" style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h2 className="text-sm font-semibold mb-3" style={{ color: '#94a3b8' }}>Resumo do relatório</h2>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <dt className="text-xs" style={{ color: '#64748b' }}>Diários</dt>
            <dd className="text-xl font-bold" style={{ color: '#f1f5f9' }}>{data.diarios.length}</dd>
          </div>
          <div>
            <dt className="text-xs" style={{ color: '#64748b' }}>HH total</dt>
            <dd className="text-xl font-bold" style={{ color: '#f1f5f9' }}>
              {data.diarios.reduce((s, d) => s + d.mao_de_obra.reduce((a, r) => a + r.quantidade * r.horas, 0), 0).toFixed(0)}
            </dd>
          </div>
          <div>
            <dt className="text-xs" style={{ color: '#64748b' }}>Ocorrências críticas</dt>
            <dd className="text-xl font-bold text-red-400">
              {data.diarios.reduce((s, d) => s + d.ocorrencias.filter(o => o.classe === 'critica').length, 0)}
            </dd>
          </div>
          <div>
            <dt className="text-xs" style={{ color: '#64748b' }}>Serviços registrados</dt>
            <dd className="text-xl font-bold" style={{ color: '#f1f5f9' }}>
              {data.diarios.reduce((s, d) => s + d.servicos.length, 0)}
            </dd>
          </div>
        </dl>
      </div>

      <PDFDownloadLink
        document={<RelatorioPDF data={data} />}
        fileName={filename}
        className="flex items-center justify-center gap-2 w-full py-4 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors"
      >
        {({ loading, error }) =>
          error
            ? `Erro ao gerar PDF: ${error}`
            : loading
            ? '⏳ Gerando PDF...'
            : '⬇️  Baixar Relatório PDF'
        }
      </PDFDownloadLink>

      <p className="text-xs text-gray-400 text-center">
        O PDF é gerado localmente no seu navegador — nenhum dado sai do sistema.
      </p>
    </div>
  )
}
