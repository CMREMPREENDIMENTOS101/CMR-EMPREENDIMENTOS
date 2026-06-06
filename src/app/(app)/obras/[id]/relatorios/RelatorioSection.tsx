'use client'

import dynamic from 'next/dynamic'
import type { ReportData } from './RelatorioPDF'

// dynamic com ssr:false só pode ser chamado dentro de Client Component
const RelatorioDownload = dynamic(() => import('./RelatorioDownload'), { ssr: false })

export default function RelatorioSection({
  data,
  filename,
}: {
  data: ReportData
  filename: string
}) {
  return <RelatorioDownload data={data} filename={filename} />
}
