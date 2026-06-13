'use client'

import { useState, useTransition } from 'react'
import { atualizarUsuario } from './actions'
import type { Usuario } from '@/types/supabase'

export default function EditarUsuarioForm({ usuario }: { usuario: Usuario }) {
  const [open, setOpen] = useState(false)
  const [erro, setErro] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setErro('')
    startTransition(async () => {
      const res = await atualizarUsuario(formData)
      if (res?.error) setErro(res.error)
      else setOpen(false)
    })
  }

  const inputStyle = {
    width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 14,
    background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
    color: '#e2e8f0', outline: 'none',
  }
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{ fontSize: 12, color: '#94a3b8', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}
      >
        Editar
      </button>

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: '#1e293b', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', width: '100%', maxWidth: 440, padding: 24 }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>Editar usuário</h2>

            {erro && (
              <div style={{ marginBottom: 16, padding: 12, background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 8, fontSize: 13, color: '#f87171' }}>
                {erro}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input type="hidden" name="id" value={usuario.id} />

              <div>
                <label style={labelStyle}>Nome completo</label>
                <input name="nome" defaultValue={usuario.nome} required style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>E-mail</label>
                <input value={usuario.email} disabled style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }} />
              </div>

              <div>
                <label style={labelStyle}>Perfil</label>
                <select name="perfil" defaultValue={usuario.perfil} style={inputStyle}>
                  <option value="encarregado">Encarregado</option>
                  <option value="engenheiro">Engenheiro</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Status</label>
                <select name="ativo" defaultValue={usuario.ativo ? 'true' : 'false'} style={inputStyle}>
                  <option value="true">Ativo</option>
                  <option value="false">Desativado</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => { setOpen(false); setErro('') }}
                  style={{ flex: 1, border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', background: 'transparent', borderRadius: 8, padding: '9px 0', fontSize: 14, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  style={{ flex: 1, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: isPending ? 0.6 : 1 }}
                >
                  {isPending ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
