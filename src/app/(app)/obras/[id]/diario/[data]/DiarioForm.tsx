'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { salvarDiario } from './actions'
import FotosSection from './FotosSection'
import type { ClimaTipo, TurnoTipo, EquipStatus, OcorrClasse, Etapa, PerfilGlobal } from '@/types/supabase'

type MaoRow = { id: string; funcao: string; quantidade: number; horas: number; subempreiteira_nome: string; subempreiteira_cnpj: string }
type EquipRow = { id: string; nome: string; status: EquipStatus; horas_uso: number }
type ServicoRow = { id: string; descricao: string; etapa_id: string; percentual_conclusao: number; localizacao: string }
type MaterialRow = { id: string; item: string; quantidade: string; unidade: string; fornecedor: string; nota_fiscal: string }
type OcorrRow = { id: string; descricao: string; classe: OcorrClasse }

interface InitialData {
  id?: string
  status?: string
  clima_manha?: ClimaTipo | null
  clima_tarde?: ClimaTipo | null
  turno?: TurnoTipo | null
  observacoes?: string | null
  maoDeObra?: MaoRow[]
  equipamentos?: EquipRow[]
  servicos?: ServicoRow[]
  materiais?: MaterialRow[]
  ocorrencias?: OcorrRow[]
}

interface Props {
  obraId: string
  data: string
  perfil: PerfilGlobal
  etapas: Pick<Etapa, 'id' | 'nome'>[]
  initial: InitialData
}

function uid() { return Math.random().toString(36).slice(2) }

export default function DiarioForm({ obraId, data, perfil, etapas, initial }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [mensagem, setMensagem] = useState('')
  const [restaurarVisivel, setRestaurarVisivel] = useState(false)
  const [currentDiarioId, setCurrentDiarioId] = useState<string | undefined>(initial.id)
  const localKey = `rascunho_diario_${obraId}_${data}`
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isAprovado = initial.status === 'aprovado'
  const podeAprovar = perfil === 'admin' || perfil === 'engenheiro'

  const [climaManha, setClimaManha] = useState<ClimaTipo | ''>(initial.clima_manha ?? '')
  const [climaTarde, setClimaTarde] = useState<ClimaTipo | ''>(initial.clima_tarde ?? '')
  const [turno, setTurno] = useState<TurnoTipo | ''>(initial.turno ?? '')
  const [observacoes, setObservacoes] = useState(initial.observacoes ?? '')
  const [maoDeObra, setMaoDeObra] = useState<MaoRow[]>(initial.maoDeObra ?? [])
  const [equipamentos, setEquipamentos] = useState<EquipRow[]>(initial.equipamentos ?? [])
  const [servicos, setServicos] = useState<ServicoRow[]>(initial.servicos ?? [])
  const [materiais, setMateriais] = useState<MaterialRow[]>(initial.materiais ?? [])
  const [ocorrencias, setOcorrencias] = useState<OcorrRow[]>(initial.ocorrencias ?? [])

  // Import atividades modal
  const [importOpen, setImportOpen]           = useState(false)
  const [importSearch, setImportSearch]       = useState('')
  const [importSelecionados, setImportSelecionados] = useState<Set<string>>(new Set())

  const estadoAtual = { climaManha, climaTarde, turno, observacoes, maoDeObra, equipamentos, servicos, materiais, ocorrencias }

  useEffect(() => {
    if (isAprovado) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      localStorage.setItem(localKey, JSON.stringify(estadoAtual))
    }, 1000)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [climaManha, climaTarde, turno, observacoes, maoDeObra, equipamentos, servicos, materiais, ocorrencias])

  useEffect(() => {
    if (isAprovado) return
    const salvo = localStorage.getItem(localKey)
    if (salvo && !initial.id) setRestaurarVisivel(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function abrirImport() {
    setImportSelecionados(new Set())
    setImportSearch('')
    setImportOpen(true)
  }

  function confirmarImport() {
    const jaAdicionadas = new Set(servicos.map((s) => s.etapa_id).filter(Boolean))
    const novas = etapas
      .filter((e) => importSelecionados.has(e.id) && !jaAdicionadas.has(e.id))
      .map((e) => ({ id: uid(), descricao: e.nome, etapa_id: e.id, percentual_conclusao: 0, localizacao: '' }))
    setServicos([...servicos, ...novas])
    setImportOpen(false)
  }

  function restaurarRascunho() {
    const salvo = localStorage.getItem(localKey)
    if (!salvo) return
    try {
      const d = JSON.parse(salvo)
      setClimaManha(d.climaManha ?? '')
      setClimaTarde(d.climaTarde ?? '')
      setTurno(d.turno ?? '')
      setObservacoes(d.observacoes ?? '')
      setMaoDeObra(d.maoDeObra ?? [])
      setEquipamentos(d.equipamentos ?? [])
      setServicos(d.servicos ?? [])
      setMateriais(d.materiais ?? [])
      setOcorrencias(d.ocorrencias ?? [])
    } catch {}
    setRestaurarVisivel(false)
  }

  function buildPayload(status: 'rascunho' | 'preenchido') {
    return {
      obraId,
      data,
      status,
      clima_manha: (climaManha as ClimaTipo) || null,
      clima_tarde: (climaTarde as ClimaTipo) || null,
      turno: (turno as TurnoTipo) || null,
      observacoes,
      mao_de_obra: maoDeObra.map(({ funcao, quantidade, horas, subempreiteira_nome, subempreiteira_cnpj }) => ({
        funcao, quantidade, horas, subempreiteira_nome, subempreiteira_cnpj,
      })),
      equipamentos: equipamentos.map(({ nome, status: s, horas_uso }) => ({ nome, status: s, horas_uso })),
      servicos: servicos.map(({ descricao, etapa_id, percentual_conclusao, localizacao }) => ({
        descricao, etapa_id: etapa_id || null, percentual_conclusao, localizacao,
      })),
      materiais: materiais.map(({ item, quantidade, unidade, fornecedor, nota_fiscal }) => ({
        item, quantidade: quantidade ? Number(quantidade) : null, unidade, fornecedor, nota_fiscal,
      })),
      ocorrencias: ocorrencias.map(({ descricao, classe }) => ({ descricao, classe })),
    }
  }

  async function handleSalvar(status: 'rascunho' | 'preenchido') {
    startTransition(async () => {
      const res = await salvarDiario(buildPayload(status))
      if (res?.error) {
        setMensagem(`Erro: ${res.error}`)
      } else {
        localStorage.removeItem(localKey)
        setMensagem(status === 'rascunho' ? 'Rascunho salvo.' : 'Marcado como preenchido.')
        if (res.diarioId && !currentDiarioId) setCurrentDiarioId(res.diarioId)
        router.refresh()
      }
    })
  }

  async function handleAprovar() {
    if (!currentDiarioId) {
      setMensagem('Salve o diário antes de aprovar.')
      return
    }
    startTransition(async () => {
      const res = await fetch('/api/diario/aprovar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diarioId: currentDiarioId }),
      })
      const json = await res.json()
      if (json.error) {
        setMensagem(`Erro: ${json.error}`)
      } else {
        localStorage.removeItem(localKey)
        setMensagem('Diário aprovado.')
        router.refresh()
      }
    })
  }

  const statusBadge = initial.status === 'aprovado'
    ? 'bg-green-100 text-green-700'
    : initial.status === 'preenchido'
    ? 'bg-blue-100 text-blue-700'
    : 'bg-gray-100 text-gray-500'

  const statusLabel = initial.status === 'aprovado' ? 'Aprovado' : initial.status === 'preenchido' ? 'Preenchido' : 'Rascunho'

  const dataBR = new Date(data + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })

  return (
    <div className="space-y-5 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400 capitalize">{dataBR}</p>
          {initial.status && (
            <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge}`}>
              {statusLabel}
            </span>
          )}
        </div>
      </div>

      {restaurarVisivel && (
        <div className="rounded-xl p-4 flex items-center justify-between" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.25)' }}>
          <p className="text-sm" style={{ color: '#fbbf24' }}>Existe um rascunho local não salvo. Deseja restaurar?</p>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => setRestaurarVisivel(false)} className="text-xs" style={{ color: '#64748b' }}>
              Ignorar
            </button>
            <button onClick={restaurarRascunho} className="text-xs font-semibold" style={{ color: '#f59e0b' }}>
              Restaurar
            </button>
          </div>
        </div>
      )}

      {/* Dados gerais */}
      <Section title="Dados gerais">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Clima manhã</label>
            <select value={climaManha} onChange={(e) => setClimaManha(e.target.value as ClimaTipo)} disabled={isAprovado} className="input">
              <option value="">—</option>
              <option value="sol">☀️ Sol</option>
              <option value="nublado">⛅ Nublado</option>
              <option value="chuva">🌧️ Chuva</option>
              <option value="garoa">🌦️ Garoa</option>
            </select>
          </div>
          <div>
            <label className="label">Clima tarde</label>
            <select value={climaTarde} onChange={(e) => setClimaTarde(e.target.value as ClimaTipo)} disabled={isAprovado} className="input">
              <option value="">—</option>
              <option value="sol">☀️ Sol</option>
              <option value="nublado">⛅ Nublado</option>
              <option value="chuva">🌧️ Chuva</option>
              <option value="garoa">🌦️ Garoa</option>
            </select>
          </div>
          <div>
            <label className="label">Turno</label>
            <select value={turno} onChange={(e) => setTurno(e.target.value as TurnoTipo)} disabled={isAprovado} className="input">
              <option value="">—</option>
              <option value="manha">Manhã</option>
              <option value="tarde">Tarde</option>
              <option value="noturno">Noturno</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Observações gerais</label>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            disabled={isAprovado}
            rows={3}
            className="input resize-none"
            placeholder="Informações gerais do dia, condições do canteiro..."
          />
        </div>
      </Section>

      {/* Mão de obra */}
      <Section title="Mão de obra" badge={maoDeObra.length > 0 ? `${maoDeObra.reduce((s, r) => s + r.quantidade * r.horas, 0).toFixed(1)} HH` : undefined}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs" style={{ color: '#475569', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <th className="pb-2 font-medium pr-3">Função</th>
                <th className="pb-2 font-medium pr-3 w-20">Qtd</th>
                <th className="pb-2 font-medium pr-3 w-20">Horas</th>
                <th className="pb-2 font-medium pr-3 w-16">HH</th>
                <th className="pb-2 font-medium pr-3">Subempreiteira</th>
                {!isAprovado && <th className="pb-2 w-8" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {maoDeObra.map((row) => (
                <tr key={row.id}>
                  <td className="py-1.5 pr-3">
                    <input value={row.funcao} onChange={(e) => setMaoDeObra(maoDeObra.map(r => r.id === row.id ? { ...r, funcao: e.target.value } : r))} disabled={isAprovado} className="input-inline" placeholder="Ex: Pedreiro" />
                  </td>
                  <td className="py-1.5 pr-3">
                    <input type="number" min={1} value={row.quantidade} onChange={(e) => setMaoDeObra(maoDeObra.map(r => r.id === row.id ? { ...r, quantidade: Number(e.target.value) } : r))} disabled={isAprovado} className="input-inline text-center" />
                  </td>
                  <td className="py-1.5 pr-3">
                    <input type="number" min={0} step={0.5} value={row.horas} onChange={(e) => setMaoDeObra(maoDeObra.map(r => r.id === row.id ? { ...r, horas: Number(e.target.value) } : r))} disabled={isAprovado} className="input-inline text-center" />
                  </td>
                  <td className="py-1.5 pr-3 text-gray-500 text-center">{(row.quantidade * row.horas).toFixed(1)}</td>
                  <td className="py-1.5 pr-3">
                    <input value={row.subempreiteira_nome} onChange={(e) => setMaoDeObra(maoDeObra.map(r => r.id === row.id ? { ...r, subempreiteira_nome: e.target.value } : r))} disabled={isAprovado} className="input-inline" placeholder="Nome da empresa" />
                  </td>
                  {!isAprovado && (
                    <td className="py-1.5">
                      <button onClick={() => setMaoDeObra(maoDeObra.filter(r => r.id !== row.id))} className="text-gray-300 hover:text-red-400 text-base">×</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!isAprovado && (
          <button onClick={() => setMaoDeObra([...maoDeObra, { id: uid(), funcao: '', quantidade: 1, horas: 8, subempreiteira_nome: '', subempreiteira_cnpj: '' }])} className="btn-add">
            + Adicionar função
          </button>
        )}
      </Section>

      {/* Equipamentos */}
      <Section title="Equipamentos" badge={equipamentos.length > 0 ? `${equipamentos.length}` : undefined}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs" style={{ color: '#475569', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <th className="pb-2 font-medium pr-3">Equipamento</th>
                <th className="pb-2 font-medium pr-3 w-32">Status</th>
                <th className="pb-2 font-medium pr-3 w-24">Horas uso</th>
                {!isAprovado && <th className="pb-2 w-8" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {equipamentos.map((row) => (
                <tr key={row.id}>
                  <td className="py-1.5 pr-3">
                    <input value={row.nome} onChange={(e) => setEquipamentos(equipamentos.map(r => r.id === row.id ? { ...r, nome: e.target.value } : r))} disabled={isAprovado} className="input-inline" placeholder="Ex: Betoneira" />
                  </td>
                  <td className="py-1.5 pr-3">
                    <select value={row.status} onChange={(e) => setEquipamentos(equipamentos.map(r => r.id === row.id ? { ...r, status: e.target.value as EquipStatus } : r))} disabled={isAprovado} className="input-inline">
                      <option value="ativo">Ativo</option>
                      <option value="parado">Parado</option>
                      <option value="manutencao">Manutenção</option>
                    </select>
                  </td>
                  <td className="py-1.5 pr-3">
                    <input type="number" min={0} step={0.5} value={row.horas_uso} onChange={(e) => setEquipamentos(equipamentos.map(r => r.id === row.id ? { ...r, horas_uso: Number(e.target.value) } : r))} disabled={isAprovado} className="input-inline text-center" />
                  </td>
                  {!isAprovado && (
                    <td className="py-1.5">
                      <button onClick={() => setEquipamentos(equipamentos.filter(r => r.id !== row.id))} className="text-gray-300 hover:text-red-400 text-base">×</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!isAprovado && (
          <button onClick={() => setEquipamentos([...equipamentos, { id: uid(), nome: '', status: 'ativo', horas_uso: 0 }])} className="btn-add">
            + Adicionar equipamento
          </button>
        )}
      </Section>

      {/* Serviços */}
      <Section title="Serviços executados" badge={servicos.length > 0 ? `${servicos.length}` : undefined}>
        <div className="space-y-3">
          {servicos.map((row) => (
            <div key={row.id} className="grid grid-cols-1 md:grid-cols-4 gap-2 p-3 rounded-lg relative" style={{ background: 'rgba(255,255,255,0.04)' }}>
              {!isAprovado && (
                <button onClick={() => setServicos(servicos.filter(r => r.id !== row.id))} className="absolute top-2 right-2 text-gray-300 hover:text-red-400 text-base">×</button>
              )}
              <div className="md:col-span-2">
                <label className="label">Descrição</label>
                <input value={row.descricao} onChange={(e) => setServicos(servicos.map(r => r.id === row.id ? { ...r, descricao: e.target.value } : r))} disabled={isAprovado} className="input" placeholder="Serviço executado..." />
              </div>
              <div>
                <label className="label">Etapa</label>
                <select value={row.etapa_id} onChange={(e) => setServicos(servicos.map(r => r.id === row.id ? { ...r, etapa_id: e.target.value } : r))} disabled={isAprovado} className="input">
                  <option value="">— Sem etapa</option>
                  {etapas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="label">% conclusão</label>
                <input type="number" min={0} max={100} value={row.percentual_conclusao} onChange={(e) => setServicos(servicos.map(r => r.id === row.id ? { ...r, percentual_conclusao: Number(e.target.value) } : r))} disabled={isAprovado} className="input" />
              </div>
              <div className="md:col-span-4">
                <label className="label">Localização (pavimento / setor / bloco)</label>
                <input value={row.localizacao} onChange={(e) => setServicos(servicos.map(r => r.id === row.id ? { ...r, localizacao: e.target.value } : r))} disabled={isAprovado} className="input" placeholder="Ex: 3º pavimento — ala norte" />
              </div>
            </div>
          ))}
        </div>
        {!isAprovado && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setServicos([...servicos, { id: uid(), descricao: '', etapa_id: '', percentual_conclusao: 0, localizacao: '' }])}
              className="btn-add"
            >
              + Adicionar serviço
            </button>
            {etapas.length > 0 && (
              <button
                onClick={abrirImport}
                style={{ fontSize: 13, color: '#60a5fa', background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontWeight: 500 }}
              >
                ↓ Importar atividades
              </button>
            )}
          </div>
        )}
      </Section>

      {/* Materiais */}
      <Section title="Materiais recebidos" badge={materiais.length > 0 ? `${materiais.length}` : undefined}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs" style={{ color: '#475569', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <th className="pb-2 font-medium pr-3">Material</th>
                <th className="pb-2 font-medium pr-3 w-24">Qtd</th>
                <th className="pb-2 font-medium pr-3 w-20">Un.</th>
                <th className="pb-2 font-medium pr-3">Fornecedor</th>
                <th className="pb-2 font-medium pr-3">NF</th>
                {!isAprovado && <th className="pb-2 w-8" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {materiais.map((row) => (
                <tr key={row.id}>
                  <td className="py-1.5 pr-3"><input value={row.item} onChange={(e) => setMateriais(materiais.map(r => r.id === row.id ? { ...r, item: e.target.value } : r))} disabled={isAprovado} className="input-inline" placeholder="Ex: Cimento CP-II" /></td>
                  <td className="py-1.5 pr-3"><input type="number" min={0} value={row.quantidade} onChange={(e) => setMateriais(materiais.map(r => r.id === row.id ? { ...r, quantidade: e.target.value } : r))} disabled={isAprovado} className="input-inline text-center" /></td>
                  <td className="py-1.5 pr-3"><input value={row.unidade} onChange={(e) => setMateriais(materiais.map(r => r.id === row.id ? { ...r, unidade: e.target.value } : r))} disabled={isAprovado} className="input-inline text-center" placeholder="sc" /></td>
                  <td className="py-1.5 pr-3"><input value={row.fornecedor} onChange={(e) => setMateriais(materiais.map(r => r.id === row.id ? { ...r, fornecedor: e.target.value } : r))} disabled={isAprovado} className="input-inline" /></td>
                  <td className="py-1.5 pr-3"><input value={row.nota_fiscal} onChange={(e) => setMateriais(materiais.map(r => r.id === row.id ? { ...r, nota_fiscal: e.target.value } : r))} disabled={isAprovado} className="input-inline" /></td>
                  {!isAprovado && <td className="py-1.5"><button onClick={() => setMateriais(materiais.filter(r => r.id !== row.id))} className="text-gray-300 hover:text-red-400 text-base">×</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!isAprovado && (
          <button onClick={() => setMateriais([...materiais, { id: uid(), item: '', quantidade: '', unidade: '', fornecedor: '', nota_fiscal: '' }])} className="btn-add">
            + Adicionar material
          </button>
        )}
      </Section>

      {/* Ocorrências */}
      <Section title="Ocorrências" badge={ocorrencias.length > 0 ? `${ocorrencias.filter(o => o.classe === 'critica').length > 0 ? '⚠️ ' : ''}${ocorrencias.length}` : undefined}>
        <div className="space-y-2">
          {ocorrencias.map((row) => (
            <div key={row.id} className="flex gap-3 p-3 rounded-lg relative" style={{ background: row.classe === 'critica' ? 'rgba(220,38,38,0.12)' : row.classe === 'alerta' ? 'rgba(234,179,8,0.1)' : 'rgba(255,255,255,0.04)', border: row.classe === 'critica' ? '1px solid rgba(220,38,38,0.3)' : row.classe === 'alerta' ? '1px solid rgba(234,179,8,0.2)' : '1px solid rgba(255,255,255,0.05)' }}>
              {!isAprovado && <button onClick={() => setOcorrencias(ocorrencias.filter(r => r.id !== row.id))} className="absolute top-2 right-2 text-gray-300 hover:text-red-400 text-base">×</button>}
              <div className="flex-1 min-w-0">
                <textarea value={row.descricao} onChange={(e) => setOcorrencias(ocorrencias.map(r => r.id === row.id ? { ...r, descricao: e.target.value } : r))} disabled={isAprovado} rows={2} className="input resize-none" placeholder="Descreva a ocorrência..." />
              </div>
              <div className="flex-shrink-0 w-32">
                <label className="label">Classe</label>
                <select value={row.classe} onChange={(e) => setOcorrencias(ocorrencias.map(r => r.id === row.id ? { ...r, classe: e.target.value as OcorrClasse } : r))} disabled={isAprovado} className="input">
                  <option value="informativa">Informativa</option>
                  <option value="alerta">Alerta</option>
                  <option value="critica">Crítica</option>
                </select>
              </div>
            </div>
          ))}
        </div>
        {!isAprovado && (
          <button onClick={() => setOcorrencias([...ocorrencias, { id: uid(), descricao: '', classe: 'informativa' }])} className="btn-add">
            + Adicionar ocorrência
          </button>
        )}
      </Section>

      {/* Fotos */}
      <Section title="Fotos">
        <FotosSection
          obraId={obraId}
          diarioId={currentDiarioId}
          isAprovado={isAprovado}
        />
      </Section>

      {/* Modal — Importar atividades */}
      {importOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setImportOpen(false)}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} />
          <div
            style={{ position: 'relative', background: '#1e293b', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', width: '100%', maxWidth: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: '20px 24px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>Importar atividades</h2>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#475569' }}>
                    Selecione as atividades do cronograma para adicionar como serviços
                  </p>
                </div>
                <button onClick={() => setImportOpen(false)}
                  style={{ background: 'transparent', border: 'none', color: '#475569', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
              </div>
              <input
                type="search"
                placeholder="Filtrar atividades..."
                value={importSearch}
                onChange={(e) => setImportSearch(e.target.value)}
                autoFocus
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: '#0f172a', color: '#e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
              {(() => {
                const jaAdicionadas = new Set(servicos.map((s) => s.etapa_id).filter(Boolean))
                const visiveis = etapas.filter((e) =>
                  !importSearch || e.nome.toLowerCase().includes(importSearch.toLowerCase())
                )
                if (visiveis.length === 0) return (
                  <p style={{ textAlign: 'center', padding: '24px 0', color: '#475569', fontSize: 13 }}>
                    Nenhuma atividade encontrada
                  </p>
                )
                return visiveis.map((e) => {
                  const jaTem = jaAdicionadas.has(e.id)
                  const marcado = importSelecionados.has(e.id)
                  return (
                    <label
                      key={e.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 12px', borderRadius: 8, cursor: jaTem ? 'default' : 'pointer',
                        marginBottom: 2,
                        background: marcado ? 'rgba(96,165,250,0.1)' : 'transparent',
                        border: marcado ? '1px solid rgba(96,165,250,0.2)' : '1px solid transparent',
                        opacity: jaTem ? 0.4 : 1,
                        transition: 'background .1s',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={marcado}
                        disabled={jaTem}
                        onChange={() => {
                          if (jaTem) return
                          setImportSelecionados((prev) => {
                            const next = new Set(prev)
                            if (next.has(e.id)) next.delete(e.id)
                            else next.add(e.id)
                            return next
                          })
                        }}
                        style={{ width: 16, height: 16, accentColor: '#60a5fa', flexShrink: 0 }}
                      />
                      <span style={{ fontSize: 13, color: jaTem ? '#475569' : '#e2e8f0', flex: 1 }}>
                        {e.nome}
                      </span>
                      {jaTem && (
                        <span style={{ fontSize: 10, color: '#475569', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 99, flexShrink: 0 }}>
                          já adicionada
                        </span>
                      )}
                    </label>
                  )
                })
              })()}
            </div>

            {/* Footer */}
            <div style={{ padding: '12px 24px 20px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ fontSize: 12, color: '#475569' }}>
                {importSelecionados.size > 0 ? `${importSelecionados.size} selecionada${importSelecionados.size > 1 ? 's' : ''}` : 'Nenhuma selecionada'}
              </span>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setImportOpen(false)}
                  style={{ padding: '8px 18px', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', background: 'transparent', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button
                  onClick={confirmarImport}
                  disabled={importSelecionados.size === 0}
                  style={{ padding: '8px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: importSelecionados.size === 0 ? 'default' : 'pointer', opacity: importSelecionados.size === 0 ? 0.5 : 1 }}>
                  Importar {importSelecionados.size > 0 ? `(${importSelecionados.size})` : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barra de ações fixa — offset 260px da sidebar */}
      {!isAprovado && (
        <div className="fixed bottom-0 left-[260px] right-0 px-4 py-3 flex items-center gap-3 z-20" style={{ background: '#0f172a', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          {mensagem && <span className="text-sm flex-1 truncate" style={{ color: '#64748b' }}>{mensagem}</span>}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => handleSalvar('rascunho')}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-60"
              style={{ border: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8', background: 'transparent' }}
            >
              {isPending ? '...' : 'Salvar rascunho'}
            </button>
            <button
              onClick={() => handleSalvar('preenchido')}
              disabled={isPending}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg disabled:opacity-60"
            >
              Marcar preenchido
            </button>
            {podeAprovar && (
              <button
                onClick={handleAprovar}
                disabled={isPending}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg disabled:opacity-60"
              >
                ✓ Aprovar
              </button>
            )}
          </div>
        </div>
      )}

      {isAprovado && (
        <div className="fixed bottom-0 left-[260px] right-0 px-4 py-3 text-center text-sm font-medium z-20" style={{ background: 'rgba(22,163,74,0.15)', borderTop: '1px solid rgba(22,163,74,0.3)', color: '#4ade80' }}>
          ✓ Diário aprovado — somente leitura
        </div>
      )}
    </div>
  )
}

function Section({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', padding: '16px 20px' }} className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '.08em', textTransform: 'uppercase' as const }}>{title}</h2>
        {badge && (
          <span className="text-xs bg-red-900/40 text-red-300 px-2 py-0.5 rounded-full font-medium">{badge}</span>
        )}
      </div>
      {children}
    </div>
  )
}
