import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NovoUsuarioForm from './NovoUsuarioForm'
import EditarUsuarioForm from './EditarUsuarioForm'

const PERFIL_BADGE: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  engenheiro: 'bg-blue-100 text-blue-700',
  encarregado: 'bg-green-100 text-green-700',
}

const PERFIL_LABEL: Record<string, string> = {
  admin: 'Admin',
  engenheiro: 'Engenheiro',
  encarregado: 'Encarregado',
}

export default async function AdminUsuariosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verificar perfil via RLS — se não for admin a query retorna vazio
  const { data: meuPerfil } = await supabase
    .from('usuarios')
    .select('perfil')
    .eq('id', user.id)
    .single()

  if (meuPerfil?.perfil !== 'admin') {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          Acesso negado. Apenas administradores podem gerenciar usuários.
        </div>
      </div>
    )
  }

  const { data: usuarios } = await supabase
    .from('usuarios')
    .select('*')
    .order('nome')

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {usuarios?.length ?? 0} usuário{(usuarios?.length ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
        <NovoUsuarioForm />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">E-mail</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Perfil</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {usuarios?.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium text-gray-900">{u.nome}</td>
                <td className="px-4 py-3 text-gray-600">{u.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${PERFIL_BADGE[u.perfil]}`}
                  >
                    {PERFIL_LABEL[u.perfil]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium ${
                      u.ativo ? 'text-green-600' : 'text-gray-400'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        u.ativo ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                    {u.ativo ? 'Ativo' : 'Desativado'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <EditarUsuarioForm usuario={u} />
                </td>
              </tr>
            ))}

            {(!usuarios || usuarios.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">
                  Nenhum usuário cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
