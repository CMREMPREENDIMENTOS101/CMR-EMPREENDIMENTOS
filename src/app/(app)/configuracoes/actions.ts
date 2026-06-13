'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function uploadLogo(
  formData: FormData,
): Promise<{ error?: string; url?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { data: usuarioRow } = await supabase
    .from('usuarios')
    .select('empresa_id, perfil')
    .eq('id', user.id)
    .single()

  let empresaId: string | null = usuarioRow?.empresa_id ?? null

  // Se o usuário não tiver empresa, busca qualquer uma existente ou cria
  if (!empresaId) {
    const { data: anyEmpresa } = await supabase
      .from('empresas')
      .select('id')
      .limit(1)
      .maybeSingle()

    if (anyEmpresa) {
      empresaId = anyEmpresa.id
    } else {
      const { data: newEmpresa, error: createErr } = await supabase
        .from('empresas')
        .insert({ razao_social: 'CMR Empreendimentos' })
        .select('id')
        .single()

      if (createErr || !newEmpresa)
        return { error: 'Não foi possível criar a empresa' }

      empresaId = newEmpresa.id
    }

    // Associa o usuário à empresa
    await supabase
      .from('usuarios')
      .update({ empresa_id: empresaId })
      .eq('id', user.id)
  }

  const file = formData.get('logo') as File
  if (!file || !file.size) return { error: 'Nenhum arquivo selecionado' }

  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
  if (!allowed.includes(file.type))
    return { error: 'Formato inválido. Use JPG, PNG, WebP ou SVG.' }

  if (file.size > 2 * 1024 * 1024)
    return { error: 'Arquivo muito grande. Máximo 2 MB.' }

  const ext = file.type === 'image/svg+xml' ? 'svg' : (file.name.split('.').pop() ?? 'png')
  const path = `logos/${empresaId}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('diario-fotos')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) return { error: uploadError.message }

  // URL válida por 10 anos
  const { data: signedData, error: signError } = await supabase.storage
    .from('diario-fotos')
    .createSignedUrl(path, 315_360_000)

  if (signError || !signedData?.signedUrl)
    return { error: 'Erro ao gerar URL da imagem' }

  const { error: updateError } = await supabase
    .from('empresas')
    .update({ logo_url: signedData.signedUrl })
    .eq('id', empresaId)

  if (updateError) return { error: updateError.message }

  revalidatePath('/', 'layout')

  return { url: signedData.signedUrl }
}
