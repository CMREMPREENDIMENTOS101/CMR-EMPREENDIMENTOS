'use client'

import { useRef, useState, useTransition } from 'react'
import { criarUsuario } from './actions'

export default function NovoUsuarioForm() {
  const [open, setOpen] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [isPending, startTransition] = useTransition()
  const [enviado, setEnviado] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setErro('')
    setAviso('')
    startTransition(async () => {
      const res = await criarUsuario(formData)
      if (res?.error) {
        setErro(res.error)
      } else if (res?.aviso) {
        setAviso(res.aviso)
        formRef.current?.reset()
      } else {
        setEnviado(true)
        formRef.current?.reset()
      }
    })
  }

  function handleFechar() {
    setOpen(false)
    setErro('')
    setAviso('')
    setEnviado(false)
  }

  const inputStyle = {
    width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 14,
    background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
    color: '#e2e8f0', outline: 'none', boxSizing: 'border-box' as const,
  }
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
      >
        + Novo usuário
      </button>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
      <div style={{ background: '#1e293b', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', width: '100%', maxWidth: 440, padding: 24 }}>

        {enviado ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✉️</div>
            <h2 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>Usuário criado!</h2>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
              E-mail enviado com as credenciais de acesso e senha provisória.
            </p>
            <button onClick={handleFechar} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Fechar
            </button>
          </div>
        ) : (
          <>
            <h2 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>Novo usuário</h2>
            <p style={{ margin: '0 0 20px', fontSize: 12, color: '#475569' }}>
              Uma senha provisória será gerada e enviada por e-mail automaticamente.
            </p>

            {erro && (
              <div style={{ marginBottom: 16, padding: 12, background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 8, fontSize: 13, color: '#f87171' }}>
                {erro}
              </div>
            )}

            {aviso && (
              <div style={{ marginBottom: 16, padding: 12, background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 8, fontSize: 13, color: '#fbbf24', lineHeight: 1.6 }}>
                {aviso}
                <button onClick={handleFechar} style={{ display: 'block', marginTop: 8, fontSize: 12, color: '#94a3b8', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                  Fechar
                </button>
              </div>
            )}

            {!aviso && (
              <form ref={formRef} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Nome completo</label>
                  <input name="nome" required style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>E-mail</label>
                  <input name="email" type="email" required style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Perfil</label>
                  <select name="perfil" required style={inputStyle}>
                    <option value="encarregado">Encarregado</option>
                    <option value="engenheiro">Engenheiro</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                  <button type="button" onClick={handleFechar}
                    style={{ flex: 1, border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', background: 'transparent', borderRadius: 8, padding: '9px 0', fontSize: 14, cursor: 'pointer' }}>
                    Cancelar
                  </button>
                  <button type="submit" disabled={isPending}
                    style={{ flex: 1, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: isPending ? 0.6 : 1 }}>
                    {isPending ? 'Criando...' : 'Criar usuário'}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}
