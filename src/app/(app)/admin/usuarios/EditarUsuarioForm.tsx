'use client'

import { useState, useTransition } from 'react'
import { atualizarUsuario } from './actions'
import type { Usuario } from '@/types/supabase'

const PERFIL_LABEL: Record<string, string> = {
  admin: 'Admin',
  engenheiro: 'Engenheiro',
  encarregado: 'Encarregado',
}

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

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-orange-500 hover:text-orange-700 text-sm font-medium"
      >
        Editar
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Editar usuário
            </h2>

            {erro && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {erro}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="hidden" name="id" value={usuario.id} />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome completo
                </label>
                <input
                  name="nome"
                  defaultValue={usuario.nome}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-mail
                </label>
                <input
                  value={usuario.email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Perfil
                </label>
                <select
                  name="perfil"
                  defaultValue={usuario.perfil}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="encarregado">Encarregado</option>
                  <option value="engenheiro">Engenheiro</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  name="ativo"
                  defaultValue={usuario.ativo ? 'true' : 'false'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="true">Ativo</option>
                  <option value="false">Desativado</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setOpen(false); setErro('') }}
                  className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold py-2 rounded-lg"
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
