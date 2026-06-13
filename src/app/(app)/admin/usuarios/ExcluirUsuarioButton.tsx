'use client'

import { useState, useTransition } from 'react'
import { excluirUsuario } from './actions'

export default function ExcluirUsuarioButton({ id, nome }: { id: string; nome: string }) {
  const [confirmando, setConfirmando] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [erro, setErro] = useState('')

  function handleExcluir() {
    startTransition(async () => {
      const res = await excluirUsuario(id)
      if (res?.error) {
        setErro(res.error)
        setConfirmando(false)
      }
    })
  }

  if (confirmando) {
    return (
      <div className="flex items-center gap-2">
        {erro && <span className="text-xs text-red-400">{erro}</span>}
        <span className="text-xs" style={{ color: '#94a3b8' }}>Confirmar exclusão?</span>
        <button
          onClick={handleExcluir}
          disabled={isPending}
          className="text-xs font-semibold px-2 py-1 rounded disabled:opacity-50"
          style={{ background: 'rgba(220,38,38,0.15)', color: '#f87171', border: '1px solid rgba(220,38,38,0.3)' }}
        >
          {isPending ? '...' : 'Excluir'}
        </button>
        <button
          onClick={() => { setConfirmando(false); setErro('') }}
          className="text-xs px-2 py-1 rounded"
          style={{ color: '#64748b', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirmando(true)}
      className="text-xs px-2 py-1 rounded transition-colors"
      style={{ color: '#64748b' }}
      title={`Excluir ${nome}`}
    >
      Excluir
    </button>
  )
}
