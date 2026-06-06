'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import type { PerfilGlobal } from '@/types/supabase'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data } = await supabase
    .from('usuarios')
    .select('perfil')
    .eq('id', user.id)
    .single()

  if (data?.perfil !== 'admin') throw new Error('Acesso negado')
}

export async function criarUsuario(formData: FormData) {
  await assertAdmin()

  const nome = formData.get('nome') as string
  const email = formData.get('email') as string
  const senha = formData.get('senha') as string
  const perfil = formData.get('perfil') as PerfilGlobal

  const admin = createAdminSupabaseClient()

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome },
  })

  if (authError) {
    return { error: authError.message }
  }

  const { error: dbError } = await admin.from('usuarios').insert({
    id: authData.user.id,
    nome,
    email,
    perfil,
    ativo: true,
  })

  if (dbError) {
    // Rollback: remover auth user se o insert falhou
    await admin.auth.admin.deleteUser(authData.user.id)
    return { error: dbError.message }
  }

  revalidatePath('/admin/usuarios')
  return { success: true }
}

export async function atualizarUsuario(formData: FormData) {
  await assertAdmin()

  const id = formData.get('id') as string
  const nome = formData.get('nome') as string
  const perfil = formData.get('perfil') as PerfilGlobal
  const ativo = formData.get('ativo') === 'true'

  const admin = createAdminSupabaseClient()

  const { error } = await admin
    .from('usuarios')
    .update({ nome, perfil, ativo })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/usuarios')
  return { success: true }
}
