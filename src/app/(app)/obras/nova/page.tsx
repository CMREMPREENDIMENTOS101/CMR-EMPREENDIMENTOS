import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { criarObra } from './actions'

export default async function NovaObraPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error: errorParam } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: meuPerfil } = await supabase
    .from('usuarios')
    .select('perfil')
    .eq('id', user.id)
    .single()

  if (meuPerfil?.perfil !== 'admin') redirect('/obras')

  const { data: usuarios } = await supabase
    .from('usuarios')
    .select('id, nome, perfil, email')
    .eq('ativo', true)
    .neq('id', user.id)
    .order('nome')

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/obras" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Obras
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">Nova obra</h1>
      </div>

      {errorParam === '1' && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          Não foi possível criar a obra. Verifique os dados e tente novamente.
        </div>
      )}

      <form action={criarObra} className="space-y-6">
        {/* Identificação */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Identificação
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome da obra <span className="text-red-500">*</span>
            </label>
            <input
              name="nome"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Ex: Residencial Alvorada — Bloco A"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo
              </label>
              <select
                name="tipo"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Selecione</option>
                <option value="residencial">Residencial</option>
                <option value="comercial">Comercial</option>
                <option value="industrial">Industrial</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nº do contrato
              </label>
              <input
                name="numero_contrato"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Endereço
            </label>
            <input
              name="endereco"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Rua, número, bairro — cidade/UF"
            />
          </div>
        </section>

        {/* Datas e responsável */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Cronograma e responsabilidade
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data de início
              </label>
              <input
                name="data_inicio"
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Previsão de término
              </label>
              <input
                name="previsao_termino"
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Responsável técnico
              </label>
              <input
                name="responsavel_tecnico"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Nome do engenheiro"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ART / RRT
              </label>
              <input
                name="art_rrt"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        </section>

        {/* Equipe */}
        {usuarios && usuarios.length > 0 && (
          <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Equipe
            </h2>
            <p className="text-xs text-gray-500">
              Selecione quem terá acesso a esta obra (você é adicionado automaticamente).
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {usuarios.map((u) => (
                <label
                  key={u.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    name="membros"
                    value={u.id}
                    className="accent-orange-500"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{u.nome}</p>
                    <p className="text-xs text-gray-400 capitalize">{u.perfil} · {u.email}</p>
                  </div>
                </label>
              ))}
            </div>
          </section>
        )}

        {/* Ações */}
        <div className="flex gap-3">
          <Link
            href="/obras"
            className="flex-1 text-center border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
          >
            Criar obra
          </button>
        </div>
      </form>
    </div>
  )
}
