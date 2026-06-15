'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Etapa } from '@/types/supabase'
import { atualizarEtapa, criarEtapa } from '../cronograma/actions'

interface Props {
  obraId: string
  etapas: Etapa[]
}

const hoje = new Date().toISOString().split('T')[0]

function fmt(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function ProgressBar({ prev, real }: { prev: number; real: number }) {
  return (
    <div style={{ position: 'relative', height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', height: '100%', background: 'rgba(255,255,255,0.15)', borderRadius: 99, width: `${Math.min(prev, 100)}%` }} />
      <div style={{ position: 'absolute', height: '100%', background: real >= prev ? '#22c55e' : '#dc2626', borderRadius: 99, width: `${Math.min(real, 100)}%`, transition: 'width 0.3s' }} />
    </div>
  )
}

function EtapaRow({ e, obraId }: { e: Etapa; obraId: string }) {
  const [editando, setEditando] = useState(false)
  const [valor, setValor] = useState(String(e.percentual_real))
  const [realLocal, setRealLocal] = useState(e.percentual_real)
  const [isPending, startTransition] = useTransition()

  function salvar() {
    const n = Math.max(0, Math.min(100, Number(valor)))
    startTransition(async () => {
      await atualizarEtapa(obraId, e.id, { percentual_real: n })
      setRealLocal(n)
      setEditando(false)
    })
  }

  const atrasada = e.data_fim_prev && e.data_fim_prev < hoje && realLocal < 100
  const adiantada = realLocal >= e.percentual_previsto

  return (
    <li style={{
      background: '#1e293b',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 10,
      padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
        <div style={{ minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', display: 'block', marginBottom: 2 }}>{e.nome}</span>
          <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#475569', flexWrap: 'wrap' }}>
            <span>Prev: {fmt(e.data_inicio_prev)} → {fmt(e.data_fim_prev)}</span>
            {(e.data_inicio_real || e.data_fim_real) && (
              <span>Real: {fmt(e.data_inicio_real)} → {fmt(e.data_fim_real)}</span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {atrasada && (
            <span style={{ fontSize: 10, background: '#7f1d1d', color: '#fca5a5', padding: '2px 6px', borderRadius: 99, fontWeight: 500 }}>
              atrasada
            </span>
          )}
          {adiantada && !atrasada && realLocal > 0 && (
            <span style={{ fontSize: 10, background: '#14532d', color: '#86efac', padding: '2px 6px', borderRadius: 99, fontWeight: 500 }}>
              em dia
            </span>
          )}

          {editando ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="number"
                min={0}
                max={100}
                value={valor}
                onChange={e => setValor(e.target.value)}
                onKeyDown={ev => { if (ev.key === 'Enter') salvar(); if (ev.key === 'Escape') setEditando(false) }}
                autoFocus
                style={{
                  width: 56, padding: '3px 8px', fontSize: 13, fontWeight: 600,
                  background: '#0f172a', border: '1px solid #dc2626',
                  borderRadius: 6, color: '#f1f5f9', textAlign: 'center', outline: 'none',
                }}
              />
              <span style={{ fontSize: 12, color: '#64748b' }}>%</span>
              <button
                onClick={salvar}
                disabled={isPending}
                style={{ fontSize: 11, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}
              >
                {isPending ? '...' : 'OK'}
              </button>
              <button
                onClick={() => setEditando(false)}
                style={{ fontSize: 11, background: 'transparent', color: '#64748b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setValor(String(realLocal)); setEditando(true) }}
              style={{
                fontSize: 13, fontWeight: 700,
                color: realLocal >= e.percentual_previsto ? '#4ade80' : '#dc2626',
                background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
              }}
              title="Clique para editar"
            >
              {realLocal}%
            </button>
          )}
        </div>
      </div>

      <ProgressBar prev={e.percentual_previsto} real={realLocal} />

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#475569', marginTop: 4 }}>
        <span>Previsto: {e.percentual_previsto}%</span>
        <Link
          href={`/obras/${obraId}/diario/${hoje}`}
          style={{ color: '#94a3b8', textDecoration: 'none' }}
        >
          → Registrar hoje
        </Link>
      </div>
    </li>
  )
}

// ─── Modal de criação ───────────────────────────────────────────

interface NovaEtapaForm {
  nome: string
  data_inicio_prev: string
  data_fim_prev: string
  percentual_previsto: string
}

const EMPTY_NOVA: NovaEtapaForm = { nome: '', data_inicio_prev: '', data_fim_prev: '', percentual_previsto: '100' }

function NovaEtapaModal({
  obraId, roots, initialPaiId, ordem, onClose, onSaved,
}: {
  obraId: string
  roots: Etapa[]
  initialPaiId: string | null
  ordem: number
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<NovaEtapaForm>(EMPTY_NOVA)
  const [paiId, setPaiId] = useState<string | null>(initialPaiId)
  const [erro, setErro] = useState('')
  const [isPending, startTransition] = useTransition()

  const inp: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 6,
    background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)',
    color: '#f1f5f9', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  }
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 600, color: '#94a3b8',
    marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em',
  }

  function salvar() {
    if (!form.nome.trim()) { setErro('Informe o nome.'); return }
    startTransition(async () => {
      const res = await criarEtapa(obraId, {
        nome: form.nome.trim(),
        etapa_pai_id: paiId,
        data_inicio_prev: form.data_inicio_prev || null,
        data_fim_prev: form.data_fim_prev || null,
        data_inicio_real: null,
        data_fim_real: null,
        percentual_previsto: Math.max(0, Math.min(100, Number(form.percentual_previsto) || 100)),
        percentual_real: 0,
        ordem,
      })
      if (res?.error) { setErro(res.error); return }
      onSaved()
    })
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
      <div
        style={{ position: 'relative', background: '#1e293b', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', width: '100%', maxWidth: 440, padding: 22 }}
        onClick={(ev) => ev.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>
            {paiId ? 'Nova subetapa' : 'Nova etapa'}
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={lbl}>Nome *</label>
            <input
              value={form.nome}
              onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') salvar() }}
              autoFocus
              placeholder={paiId ? 'Ex: Concretagem, Armação...' : 'Ex: Fundação, Estrutura...'}
              style={inp}
            />
          </div>

          <div>
            <label style={lbl}>Etapa pai (opcional)</label>
            <select value={paiId ?? ''} onChange={(e) => setPaiId(e.target.value || null)} style={inp}>
              <option value="">— Nenhuma (etapa principal)</option>
              {roots.map((r) => (
                <option key={r.id} value={r.id}>{r.nome}</option>
              ))}
            </select>
            <p style={{ margin: '6px 0 0', fontSize: 11, color: '#64748b' }}>
              Selecione uma etapa para criar uma subetapa.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Início previsto</label>
              <input type="date" value={form.data_inicio_prev} onChange={(e) => setForm((p) => ({ ...p, data_inicio_prev: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={lbl}>Fim previsto</label>
              <input type="date" value={form.data_fim_prev} onChange={(e) => setForm((p) => ({ ...p, data_fim_prev: e.target.value }))} style={inp} />
            </div>
          </div>

          <div style={{ maxWidth: 140 }}>
            <label style={lbl}>% Previsto</label>
            <input type="number" min={0} max={100} value={form.percentual_previsto} onChange={(e) => setForm((p) => ({ ...p, percentual_previsto: e.target.value }))} style={inp} />
          </div>

          {erro && (
            <div style={{ padding: '8px 12px', background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.4)', borderRadius: 6, fontSize: 13, color: '#fca5a5' }}>{erro}</div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', border: '1px solid rgba(255,255,255,0.12)', color: '#cbd5e1', background: 'transparent', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={isPending || !form.nome.trim()}
            style={{ padding: '8px 22px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: isPending || !form.nome.trim() ? 0.6 : 1 }}
          >
            {isPending ? 'Salvando...' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ───────────────────────────────────────

export default function ListaTarefasClient({ obraId, etapas }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [initialPai, setInitialPai] = useState<string | null>(null)

  const semPai = etapas.filter(e => !e.etapa_pai_id)
  const comPai = etapas.filter(e => e.etapa_pai_id)

  const avanco = etapas.length > 0
    ? Math.round(etapas.reduce((s, e) => s + e.percentual_real, 0) / etapas.length)
    : 0

  function abrir(paiId: string | null) {
    setInitialPai(paiId)
    setOpen(true)
  }

  function onSaved() {
    setOpen(false)
    router.refresh()
  }

  const subBtn: React.CSSProperties = {
    margin: '6px 0 0 20px', fontSize: 11, color: '#94a3b8',
    background: 'transparent', border: '1px dashed rgba(255,255,255,0.15)',
    borderRadius: 6, padding: '5px 12px', cursor: 'pointer',
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Lista de Tarefas</h1>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            {etapas.length} etapa{etapas.length !== 1 ? 's' : ''} · Avanço médio {avanco}%
          </p>
        </div>
        <button
          onClick={() => abrir(null)}
          style={{
            background: '#dc2626', color: '#fff',
            padding: '8px 16px', borderRadius: 8,
            fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
          }}
        >
          + Criar etapa
        </button>
      </div>

      {/* Barra de avanço geral */}
      <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
          <span>Avanço geral da obra</span>
          <span style={{ fontWeight: 700, color: '#f1f5f9' }}>{avanco}%</span>
        </div>
        <div style={{ height: 10, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: avanco >= 100 ? '#22c55e' : '#dc2626', borderRadius: 99, width: `${avanco}%`, transition: 'width 0.4s' }} />
        </div>
      </div>

      {etapas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#475569' }}>
          <p style={{ fontSize: 14, marginBottom: 12 }}>Nenhuma etapa cadastrada.</p>
          <button
            onClick={() => abrir(null)}
            style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            + Criar primeira etapa
          </button>
        </div>
      ) : (
        <div>
          {/* Etapas principais */}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {semPai.map(e => (
              <div key={e.id}>
                <EtapaRow e={e} obraId={obraId} />
                {/* Sub-etapas */}
                {comPai.filter(s => s.etapa_pai_id === e.id).length > 0 && (
                  <ul style={{ listStyle: 'none', margin: '6px 0 0 20px', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {comPai.filter(s => s.etapa_pai_id === e.id).map(sub => (
                      <EtapaRow key={sub.id} e={sub} obraId={obraId} />
                    ))}
                  </ul>
                )}
                <button onClick={() => abrir(e.id)} style={subBtn}>
                  + Subetapa
                </button>
              </div>
            ))}
          </ul>

          {/* Etapas sem pai que ficaram (órfãs) */}
          {comPai.filter(s => !semPai.find(p => p.id === s.etapa_pai_id)).length > 0 && (
            <ul style={{ listStyle: 'none', margin: '10px 0 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {comPai.filter(s => !semPai.find(p => p.id === s.etapa_pai_id)).map(e => (
                <EtapaRow key={e.id} e={e} obraId={obraId} />
              ))}
            </ul>
          )}
        </div>
      )}

      {open && (
        <NovaEtapaModal
          obraId={obraId}
          roots={semPai}
          initialPaiId={initialPai}
          ordem={etapas.length}
          onClose={() => setOpen(false)}
          onSaved={onSaved}
        />
      )}
    </div>
  )
}
