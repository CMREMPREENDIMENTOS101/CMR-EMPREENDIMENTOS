import { createClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import LogoUploadClient from './LogoUploadClient'
import NovoUsuarioForm from '../admin/usuarios/NovoUsuarioForm'
import EditarUsuarioForm from '../admin/usuarios/EditarUsuarioForm'
import ExcluirUsuarioButton from '../admin/usuarios/ExcluirUsuarioButton'
import type { Usuario } from '@/types/supabase'

const PERFIL_LABEL: Record<string, string> = {
  admin: 'Admin',
  engenheiro: 'Engenheiro',
  encarregado: 'Encarregado',
}

export default async function ConfiguracoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuarioRow } = await supabase
    .from('usuarios')
    .select('empresa_id, perfil')
    .eq('id', user.id)
    .single()

  const isAdmin = usuarioRow?.perfil === 'admin'

  let currentLogoUrl: string | null = null
  if (usuarioRow?.empresa_id) {
    const { data: empresa } = await supabase
      .from('empresas')
      .select('logo_url')
      .eq('id', usuarioRow.empresa_id)
      .single()
    currentLogoUrl = empresa?.logo_url ?? null
  }

  let usuarios: Usuario[] = []
  if (isAdmin) {
    const admin = createAdminSupabaseClient()
    const { data } = await admin
      .from('usuarios')
      .select('*')
      .order('nome')
    usuarios = (data ?? []) as Usuario[]
  }

  const card = {
    background: '#1e293b',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 12,
    padding: '20px 24px',
  }

  const thStyle = {
    padding: '8px 12px',
    fontSize: 11,
    fontWeight: 700,
    color: '#475569',
    textAlign: 'left' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '.06em',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  }

  const tdStyle = {
    padding: '12px 12px',
    fontSize: 13,
    color: '#cbd5e1',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    verticalAlign: 'middle' as const,
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 28 }}>
      <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>
        Configurações
      </h1>

      {/* Logo */}
      <div style={card}>
        <h2 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em' }}>
          Logo da empresa
        </h2>
        <LogoUploadClient currentLogoUrl={currentLogoUrl} />
      </div>

      {/* Usuários — apenas para admins */}
      {isAdmin && (
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                Usuários
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#475569' }}>
                {usuarios.length} usuário{usuarios.length !== 1 ? 's' : ''} cadastrado{usuarios.length !== 1 ? 's' : ''}
              </p>
            </div>
            <NovoUsuarioForm />
          </div>

          {usuarios.length === 0 ? (
            <p style={{ fontSize: 13, color: '#475569', textAlign: 'center', padding: '32px 0' }}>
              Nenhum usuário cadastrado.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Nome</th>
                    <th style={thStyle}>E-mail</th>
                    <th style={thStyle}>Perfil</th>
                    <th style={thStyle}>Status</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.id}>
                      <td style={tdStyle}>
                        <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{u.nome}</span>
                        {u.id === user.id && (
                          <span style={{ marginLeft: 6, fontSize: 10, background: 'rgba(220,38,38,0.15)', color: '#f87171', padding: '1px 6px', borderRadius: 99, fontWeight: 600 }}>
                            você
                          </span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, color: '#64748b' }}>{u.email}</td>
                      <td style={tdStyle}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                          background: u.perfil === 'admin' ? 'rgba(220,38,38,0.15)' : 'rgba(255,255,255,0.06)',
                          color: u.perfil === 'admin' ? '#f87171' : '#94a3b8',
                        }}>
                          {PERFIL_LABEL[u.perfil] ?? u.perfil}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                          background: u.ativo ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)',
                          color: u.ativo ? '#4ade80' : '#475569',
                        }}>
                          {u.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                          <EditarUsuarioForm usuario={u} />
                          {u.id !== user.id && (
                            <ExcluirUsuarioButton id={u.id} nome={u.nome} />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
