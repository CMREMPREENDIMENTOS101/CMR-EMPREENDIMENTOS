'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { enviarBoasVindas } from '@/lib/email'
import type { PerfilGlobal } from '@/types/supabase'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data } = await supabase
    .from('usuarios')
    .select('perfil, empresa_id')
    .eq('id', user.id)
    .single()

  if (data?.perfil !== 'admin') throw new Error('Acesso negado')
  return { empresaId: data.empresa_id as string | null }
}

function gerarSenha(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function criarUsuario(formData: FormData) {
  const { empresaId } = await assertAdmin()

  const nome   = formData.get('nome') as string
  const email  = formData.get('email') as string
  const perfil = formData.get('perfil') as PerfilGlobal
  const senha  = gerarSenha()

  const admin = createAdminSupabaseClient()

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome },
  })

  if (authError) return { error: authError.message }

  const { error: dbError } = await admin.from('usuarios').insert({
    id: authData.user.id,
    nome,
    email,
    perfil,
    ativo: true,
    ...(empresaId ? { empresa_id: empresaId } : {}),
  })

  if (dbError) {
    await admin.auth.admin.deleteUser(authData.user.id)
    return { error: dbError.message }
  }

  try {
    await enviarBoasVindas({ nome, email, senha })
  } catch {
    revalidatePath('/admin/usuarios')
    revalidatePath('/configuracoes')
    return { success: true, aviso: `Usuário criado. E-mail não enviado — configure RESEND_API_KEY no Vercel. Senha provisória: ${senha}` }
  }

  revalidatePath('/admin/usuarios')
  revalidatePath('/configuracoes')
  return { success: true }
}

export async function atualizarUsuario(formData: FormData) {
  await assertAdmin()

  const id     = formData.get('id') as string
  const nome   = formData.get('nome') as string
  const perfil = formData.get('perfil') as PerfilGlobal
  const ativo  = formData.get('ativo') === 'true'

  const admin = createAdminSupabaseClient()

  const { error } = await admin
    .from('usuarios')
    .update({ nome, perfil, ativo })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/usuarios')
  revalidatePath('/configuracoes')
  return { success: true }
}

export async function excluirUsuario(id: string) {
  await assertAdmin()

  const admin = createAdminSupabaseClient()

  const { error: dbError } = await admin.from('usuarios').delete().eq('id', id)
  if (dbError) return { error: dbError.message }

  const { error: authError } = await admin.auth.admin.deleteUser(id)
  if (authError) return { error: authError.message }

  revalidatePath('/admin/usuarios')
  revalidatePath('/configuracoes')
  return { success: true }
}
