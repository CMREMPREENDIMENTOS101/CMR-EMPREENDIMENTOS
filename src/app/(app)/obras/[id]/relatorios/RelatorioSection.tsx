'use client'

import dynamic from 'next/dynamic'
import type { ReportData } from './RelatorioPDF'

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
