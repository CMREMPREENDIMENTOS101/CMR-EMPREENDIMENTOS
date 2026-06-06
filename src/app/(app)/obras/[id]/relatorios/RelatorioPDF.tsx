'use client'

import React from 'react'
import {
  Document, Page, View, Text, StyleSheet,
} from '@react-pdf/renderer'

// ─── Tipos ────────────────────────────────────────────────────────────────
export interface ObraInfo {
  nome: string
  endereco: string | null
  responsavel_tecnico: string | null
  art_rrt: string | null
  numero_contrato: string | null
  data_inicio: string | null
  previsao_termino: string | null
}

export interface DiarioRow {
  data: string
  status: string
  clima_manha: string | null
  clima_tarde: string | null
  turno: string | null
  observacoes: string | null
  mao_de_obra: { funcao: string; quantidade: number; horas: number; subempreiteira_nome: string | null }[]
  equipamentos: { nome: string; status: string; horas_uso: number }[]
  servicos: { descricao: string; percentual_conclusao: number; localizacao: string | null }[]
  materiais: { item: string; quantidade: number | null; unidade: string | null; fornecedor: string | null; nota_fiscal: string | null }[]
  ocorrencias: { descricao: string; classe: string }[]
}

export interface ReportData {
  obra: ObraInfo
  periodo: { de: string; ate: string }
  diarios: DiarioRow[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────
const CLIMA_LABEL: Record<string, string> = {
  sol: 'Sol',
  nublado: 'Nublado',
  chuva: 'Chuva',
  garoa: 'Garoa',
}

const CLIMA_COND: Record<string, string> = {
  sol: 'Praticavel',
  nublado: 'Praticavel',
  garoa: 'Adverso',
  chuva: 'Adverso',
}

const TURNO_LABEL: Record<string, string> = {
  manha: 'Manha',
  tarde: 'Tarde',
  noturno: 'Noturno',
}

const STATUS_LABEL: Record<string, string> = {
  aprovado: 'Aprovado',
  preenchido: 'Preenchido',
  rascunho: 'Rascunho',
}

const CLASSE_LABEL: Record<string, string> = {
  critica: 'CRITICA',
  alerta: 'ALERTA',
  informativa: 'INFORMATIVA',
}

function formatDate(s: string) {
  return new Date(s + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDateLong(s: string) {
  return new Date(s + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}

function getDayOfWeek(s: string) {
  return new Date(s + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })
}

function calcPrazos(obra: ObraInfo) {
  const hoje = new Date()
  const inicio = obra.data_inicio ? new Date(obra.data_inicio + 'T00:00:00') : null
  const fim = obra.previsao_termino ? new Date(obra.previsao_termino + 'T00:00:00') : null
  const contratual = inicio && fim ? Math.round((fim.getTime() - inicio.getTime()) / 86400000) : null
  const decorrido = inicio ? Math.max(0, Math.round((hoje.getTime() - inicio.getTime()) / 86400000)) : 0
  const vencer = fim ? Math.max(0, Math.round((fim.getTime() - hoje.getTime()) / 86400000)) : null
  return { contratual, decorrido, vencer }
}

// ─── Estilos ──────────────────────────────────────────────────────────────
const C = {
  orange: '#f97316',
  orangeLight: '#fff7ed',
  blue: '#1e3a5f',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray400: '#9ca3af',
  gray700: '#374151',
  gray900: '#111827',
  red50: '#fef2f2',
  yellow50: '#fefce8',
  white: '#ffffff',
  border: '#d1d5db',
}

const s = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 36,
    paddingHorizontal: 28,
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: C.gray900,
  },
  // ─ tabela genérica (borda externa esq+topo, células fecham bot+dir)
  table: {
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: C.border,
    borderStyle: 'solid',
    marginBottom: 7,
  },
  row: { flexDirection: 'row' },
  cell: {
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: C.border,
    borderStyle: 'solid',
    padding: 4,
  },
  // ─ texto
  bold: { fontFamily: 'Helvetica-Bold' },
  label: { fontFamily: 'Helvetica-Bold', color: C.gray700, fontSize: 7 },
  value: { color: C.gray900 },
  center: { textAlign: 'center' },
  right: { textAlign: 'right' },
  // ─ cabeçalho do bloco de seção
  secHeader: {
    backgroundColor: C.gray100,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
  },
  // ─ cabeçalho de colunas (linha de th)
  colHeader: {
    backgroundColor: C.gray50,
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    color: C.gray700,
  },
  // ─ rodapé da página
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 28,
    right: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: C.gray200,
    paddingTop: 4,
  },
  footerText: {
    fontSize: 7,
    color: C.gray400,
  },
})

// ─── Componentes de tabela ────────────────────────────────────────────────
function Cell({
  children, flex, w, style, bold, center, right, bg, label,
}: {
  children?: React.ReactNode
  flex?: number
  w?: number | string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  style?: any
  bold?: boolean
  center?: boolean
  right?: boolean
  bg?: string
  label?: boolean
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewStyles: any[] = [s.cell]
  if (flex !== undefined) viewStyles.push({ flex })
  if (w !== undefined) viewStyles.push({ width: w })
  if (bg) viewStyles.push({ backgroundColor: bg })
  if (style) viewStyles.push(style)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const textStyles: any[] = [label ? s.label : s.value]
  if (bold) textStyles.push(s.bold)
  if (center) textStyles.push(s.center)
  if (right) textStyles.push(s.right)

  return (
    <View style={viewStyles}>
      <Text style={textStyles}>{children ?? ''}</Text>
    </View>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={s.row}>{children}</View>
}

// ─── Cabeçalho do RDO ────────────────────────────────────────────────────
function HeaderTable({ obra, diario, reportNum, prazos }: {
  obra: ObraInfo
  diario: DiarioRow
  reportNum: number
  prazos: ReturnType<typeof calcPrazos>
}) {
  return (
    <View style={s.table}>
      {/* Linha 1: marca | título | metadados */}
      <Row>
        {/* Coluna marca */}
        <View style={[s.cell, { width: 110, backgroundColor: C.blue, justifyContent: 'center', alignItems: 'center', paddingVertical: 10 }]}>
          <Text style={[s.bold, { color: C.white, fontSize: 13, letterSpacing: 1 }]}>CMR</Text>
          <Text style={{ color: '#93c5fd', fontSize: 7, marginTop: 2 }}>Empreendimentos</Text>
        </View>

        {/* Título central */}
        <View style={[s.cell, { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 10 }]}>
          <Text style={[s.bold, { fontSize: 11, color: C.gray900 }]}>Relatorio Diario de Obra</Text>
          <Text style={{ fontSize: 9, color: C.orange, marginTop: 3, fontFamily: 'Helvetica-Bold' }}>RDO</Text>
        </View>

        {/* Metadados */}
        <View style={[s.cell, { width: 120, padding: 0 }]}>
          <View style={[s.row, { borderBottomWidth: 1, borderColor: C.border }]}>
            <View style={{ flex: 1, padding: 3, borderRightWidth: 1, borderColor: C.border }}><Text style={s.label}>Relatorio n{'º'}</Text></View>
            <View style={{ flex: 1, padding: 3 }}><Text style={[s.bold, s.center]}>{reportNum}</Text></View>
          </View>
          <View style={[s.row, { borderBottomWidth: 1, borderColor: C.border }]}>
            <View style={{ flex: 1, padding: 3, borderRightWidth: 1, borderColor: C.border }}><Text style={s.label}>Data</Text></View>
            <View style={{ flex: 1, padding: 3 }}><Text style={s.center}>{formatDate(diario.data)}</Text></View>
          </View>
          <View style={[s.row, { borderBottomWidth: 1, borderColor: C.border }]}>
            <View style={{ flex: 1, padding: 3, borderRightWidth: 1, borderColor: C.border }}><Text style={s.label}>Dia da semana</Text></View>
            <View style={{ flex: 1, padding: 3 }}><Text style={[s.center, { textTransform: 'capitalize' }]}>{getDayOfWeek(diario.data)}</Text></View>
          </View>
          <View style={s.row}>
            <View style={{ flex: 1, padding: 3, borderRightWidth: 1, borderColor: C.border }}><Text style={s.label}>N{'º'} do contrato</Text></View>
            <View style={{ flex: 1, padding: 3 }}><Text style={s.center}>{obra.numero_contrato || '—'}</Text></View>
          </View>
        </View>
      </Row>

      {/* Linha 2: Obra + prazo contratual */}
      <Row>
        <Cell w={80} bg={C.gray50} label>Obra</Cell>
        <Cell flex={1}>{obra.nome}</Cell>
        <Cell w={100} bg={C.gray50} label>Prazo contratual</Cell>
        <Cell w={60} right>{prazos.contratual !== null ? `${prazos.contratual} dias` : '—'}</Cell>
      </Row>

      {/* Linha 3: Endereço + prazo decorrido */}
      <Row>
        <Cell w={80} bg={C.gray50} label>Endereco</Cell>
        <Cell flex={1}>{obra.endereco || '—'}</Cell>
        <Cell w={100} bg={C.gray50} label>Prazo decorrido</Cell>
        <Cell w={60} right>{prazos.decorrido} dias</Cell>
      </Row>

      {/* Linha 4: Responsável + art_rrt + prazo a vencer */}
      <Row>
        <Cell w={80} bg={C.gray50} label>Responsavel</Cell>
        <Cell flex={1}>{obra.responsavel_tecnico || '—'}</Cell>
        <Cell w={80} bg={C.gray50} label>ART/RRT</Cell>
        <Cell flex={1}>{obra.art_rrt || '—'}</Cell>
        <Cell w={100} bg={C.gray50} label>Prazo a vencer</Cell>
        <Cell w={60} right>{prazos.vencer !== null ? `${prazos.vencer} dias` : '—'}</Cell>
      </Row>

      {/* Linha 5: Turno + status */}
      <Row>
        <Cell w={80} bg={C.gray50} label>Turno</Cell>
        <Cell flex={1}>{diario.turno ? TURNO_LABEL[diario.turno] ?? diario.turno : '—'}</Cell>
        <Cell w={80} bg={C.gray50} label>Status</Cell>
        <Cell flex={1}>{STATUS_LABEL[diario.status] ?? diario.status}</Cell>
        <Cell w={100} bg={C.gray50} label />
        <Cell w={60} />
      </Row>
    </View>
  )
}

// ─── Seção: Clima ─────────────────────────────────────────────────────────
function ClimaTable({ diario }: { diario: DiarioRow }) {
  return (
    <View style={s.table}>
      {/* Header cols */}
      <Row>
        <Cell w={80} bg={C.gray100} bold>Clima</Cell>
        <Cell flex={1} bg={C.gray100} bold>Tempo</Cell>
        <Cell flex={2} bg={C.gray100} bold>Condicao</Cell>
      </Row>
      <Row>
        <Cell w={80} bg={C.gray50} label>Manha</Cell>
        <Cell flex={1}>{diario.clima_manha ? CLIMA_LABEL[diario.clima_manha] ?? diario.clima_manha : '—'}</Cell>
        <Cell flex={2}>{diario.clima_manha ? CLIMA_COND[diario.clima_manha] ?? '—' : '—'}</Cell>
      </Row>
      <Row>
        <Cell w={80} bg={C.gray50} label>Tarde</Cell>
        <Cell flex={1}>{diario.clima_tarde ? CLIMA_LABEL[diario.clima_tarde] ?? diario.clima_tarde : '—'}</Cell>
        <Cell flex={2}>{diario.clima_tarde ? CLIMA_COND[diario.clima_tarde] ?? '—' : '—'}</Cell>
      </Row>
    </View>
  )
}

// ─── Seção: Mão de Obra ───────────────────────────────────────────────────
function MdoTable({ rows }: { rows: DiarioRow['mao_de_obra'] }) {
  const totalHH = rows.reduce((s, r) => s + r.quantidade * r.horas, 0)
  return (
    <View style={s.table}>
      <Row>
        <Cell flex={1} bg={C.gray100} bold>Mao de Obra ({rows.length})</Cell>
      </Row>
      {rows.length === 0 ? (
        <Row><Cell flex={1} style={{ color: C.gray400 }}>Nenhum registro</Cell></Row>
      ) : (
        <>
          <Row>
            <Cell flex={3} bg={C.gray50} bold style={s.colHeader}>Funcao</Cell>
            <Cell w={36} bg={C.gray50} bold style={[s.colHeader, s.center]}>Qtd</Cell>
            <Cell w={36} bg={C.gray50} bold style={[s.colHeader, s.center]}>Horas</Cell>
            <Cell w={36} bg={C.gray50} bold style={[s.colHeader, s.center]}>HH</Cell>
            <Cell flex={2} bg={C.gray50} bold style={s.colHeader}>Empresa</Cell>
          </Row>
          {rows.map((r, i) => (
            <Row key={i}>
              <Cell flex={3}>{r.funcao}</Cell>
              <Cell w={36} center>{r.quantidade}</Cell>
              <Cell w={36} center>{r.horas}</Cell>
              <Cell w={36} center>{(r.quantidade * r.horas).toFixed(1)}</Cell>
              <Cell flex={2}>{r.subempreiteira_nome || '—'}</Cell>
            </Row>
          ))}
          <Row>
            <Cell flex={3} bold bg={C.orangeLight}>Total</Cell>
            <Cell w={36} bg={C.orangeLight} />
            <Cell w={36} bg={C.orangeLight} />
            <Cell w={36} bold center bg={C.orangeLight}>{totalHH.toFixed(1)}</Cell>
            <Cell flex={2} bg={C.orangeLight} />
          </Row>
        </>
      )}
    </View>
  )
}

// ─── Seção: Equipamentos ─────────────────────────────────────────────────
function EquipTable({ rows }: { rows: DiarioRow['equipamentos'] }) {
  return (
    <View style={s.table}>
      <Row>
        <Cell flex={1} bg={C.gray100} bold>Equipamentos ({rows.length})</Cell>
      </Row>
      {rows.length === 0 ? (
        <Row><Cell flex={1} style={{ color: C.gray400 }}>Nenhum registro</Cell></Row>
      ) : (
        <>
          <Row>
            <Cell flex={3} bg={C.gray50} bold style={s.colHeader}>Equipamento</Cell>
            <Cell flex={2} bg={C.gray50} bold style={s.colHeader}>Status</Cell>
            <Cell w={60} bg={C.gray50} bold style={[s.colHeader, s.center]}>Horas uso</Cell>
          </Row>
          {rows.map((r, i) => (
            <Row key={i}>
              <Cell flex={3}>{r.nome}</Cell>
              <Cell flex={2}>{r.status === 'ativo' ? 'Ativo' : r.status === 'parado' ? 'Parado' : 'Manutencao'}</Cell>
              <Cell w={60} center>{r.horas_uso}h</Cell>
            </Row>
          ))}
        </>
      )}
    </View>
  )
}

// ─── Seção: Serviços / Atividades ─────────────────────────────────────────
function ServicosTable({ rows }: { rows: DiarioRow['servicos'] }) {
  return (
    <View style={s.table}>
      <Row>
        <Cell flex={1} bg={C.gray100} bold>Atividades / Servicos Executados ({rows.length})</Cell>
      </Row>
      {rows.length === 0 ? (
        <Row><Cell flex={1} style={{ color: C.gray400 }}>Nenhum registro</Cell></Row>
      ) : (
        <>
          <Row>
            <Cell flex={3} bg={C.gray50} bold style={s.colHeader}>Descricao</Cell>
            <Cell flex={2} bg={C.gray50} bold style={s.colHeader}>Localizacao</Cell>
            <Cell w={50} bg={C.gray50} bold style={[s.colHeader, s.center]}>%</Cell>
            <Cell w={70} bg={C.gray50} bold style={s.colHeader}>Status</Cell>
          </Row>
          {rows.map((r, i) => (
            <Row key={i}>
              <Cell flex={3}>{r.descricao}</Cell>
              <Cell flex={2}>{r.localizacao || '—'}</Cell>
              <Cell w={50} center>{r.percentual_conclusao}%</Cell>
              <Cell w={70}>{r.percentual_conclusao >= 100 ? 'Concluido' : 'Em andamento'}</Cell>
            </Row>
          ))}
        </>
      )}
    </View>
  )
}

// ─── Seção: Materiais ────────────────────────────────────────────────────
function MateriaisTable({ rows }: { rows: DiarioRow['materiais'] }) {
  return (
    <View style={s.table}>
      <Row>
        <Cell flex={1} bg={C.gray100} bold>Materiais Recebidos ({rows.length})</Cell>
      </Row>
      {rows.length === 0 ? (
        <Row><Cell flex={1} style={{ color: C.gray400 }}>Nenhum registro</Cell></Row>
      ) : (
        <>
          <Row>
            <Cell flex={3} bg={C.gray50} bold style={s.colHeader}>Material</Cell>
            <Cell w={40} bg={C.gray50} bold style={[s.colHeader, s.center]}>Qtd</Cell>
            <Cell w={30} bg={C.gray50} bold style={[s.colHeader, s.center]}>Un.</Cell>
            <Cell flex={2} bg={C.gray50} bold style={s.colHeader}>Fornecedor</Cell>
            <Cell w={60} bg={C.gray50} bold style={s.colHeader}>Nota Fiscal</Cell>
          </Row>
          {rows.map((r, i) => (
            <Row key={i}>
              <Cell flex={3}>{r.item}</Cell>
              <Cell w={40} center>{r.quantidade ?? '—'}</Cell>
              <Cell w={30} center>{r.unidade || '—'}</Cell>
              <Cell flex={2}>{r.fornecedor || '—'}</Cell>
              <Cell w={60}>{r.nota_fiscal || '—'}</Cell>
            </Row>
          ))}
        </>
      )}
    </View>
  )
}

// ─── Seção: Ocorrências ───────────────────────────────────────────────────
function OcorrenciasTable({ rows }: { rows: DiarioRow['ocorrencias'] }) {
  return (
    <View style={s.table}>
      <Row>
        <Cell flex={1} bg={C.gray100} bold>Ocorrencias ({rows.length})</Cell>
      </Row>
      {rows.length === 0 ? (
        <Row><Cell flex={1} style={{ color: C.gray400 }}>Nenhuma ocorrencia</Cell></Row>
      ) : (
        rows.map((r, i) => (
          <Row key={i}>
            <Cell w={70} bg={r.classe === 'critica' ? '#fef2f2' : r.classe === 'alerta' ? '#fefce8' : C.gray50} bold>
              {CLASSE_LABEL[r.classe] ?? r.classe}
            </Cell>
            <Cell flex={1}>{r.descricao}</Cell>
          </Row>
        ))
      )}
    </View>
  )
}

// ─── Seção: Observações ───────────────────────────────────────────────────
function ObsBlock({ text }: { text: string }) {
  return (
    <View style={s.table}>
      <Row>
        <Cell flex={1} bg={C.gray100} bold>Observacoes</Cell>
      </Row>
      <Row>
        <Cell flex={1}>{text}</Cell>
      </Row>
    </View>
  )
}

// ─── Um diário completo (uma "página lógica" do RDO) ─────────────────────
function RdoDiario({
  diario, obra, reportNum, prazos, isFirst,
}: {
  diario: DiarioRow
  obra: ObraInfo
  reportNum: number
  prazos: ReturnType<typeof calcPrazos>
  isFirst: boolean
}) {
  return (
    <View break={!isFirst}>
      {/* Subtítulo da data */}
      <View style={{ backgroundColor: C.orange, paddingHorizontal: 6, paddingVertical: 3, marginBottom: 5 }}>
        <Text style={[s.bold, { color: C.white, fontSize: 8, textTransform: 'uppercase' }]}>
          {formatDateLong(diario.data)}
        </Text>
      </View>

      <HeaderTable obra={obra} diario={diario} reportNum={reportNum} prazos={prazos} />
      <ClimaTable diario={diario} />
      <MdoTable rows={diario.mao_de_obra} />
      <EquipTable rows={diario.equipamentos} />
      <ServicosTable rows={diario.servicos} />
      <MateriaisTable rows={diario.materiais} />
      <OcorrenciasTable rows={diario.ocorrencias} />
      {diario.observacoes && <ObsBlock text={diario.observacoes} />}
    </View>
  )
}

// ─── Documento PDF principal ──────────────────────────────────────────────
export default function RelatorioPDF({ data }: { data: ReportData }) {
  const prazos = calcPrazos(data.obra)
  const now = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <Document
      title={`RDO — ${data.obra.nome}`}
      author="CMR Empreendimentos"
      subject={`Relatorio Diario de Obra — ${formatDate(data.periodo.de)} a ${formatDate(data.periodo.ate)}`}
    >
      <Page size="A4" style={s.page}>
        {data.diarios.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={[s.bold, { fontSize: 12, color: C.gray400 }]}>Nenhum diario no periodo selecionado</Text>
          </View>
        ) : (
          data.diarios.map((diario, idx) => (
            <RdoDiario
              key={diario.data}
              diario={diario}
              obra={data.obra}
              reportNum={idx + 1}
              prazos={prazos}
              isFirst={idx === 0}
            />
          ))
        )}

        {/* Rodapé */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>CMR Empreendimentos — {data.obra.nome}</Text>
          <Text style={s.footerText}>Gerado em {now}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Pag. ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
