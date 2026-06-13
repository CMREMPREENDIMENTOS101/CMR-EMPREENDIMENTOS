'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

const BUCKET = 'diario-fotos'

export async function ensureBucket() {
  const admin = createAdminSupabaseClient()
  const { error } = await admin.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
  })
  if (error && !error.message.toLowerCase().includes('exist')) return { error: error.message }
  return { success: true }
}

export async function salvarFotoDb(
  diarioId: string,
  storagePath: string,
  legenda: string,
  ordem: number
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase.from('diario_fotos').insert({
    diario_id: diarioId,
    storage_path: storagePath,
    legenda: legenda || null,
    ordem,
  })
  if (error) return { error: error.message }
  return { success: true }
}

export async function deletarFotoStorage(storagePath: string) {
  const admin = createAdminSupabaseClient()
  const { error } = await admin.storage.from(BUCKET).remove([storagePath])
  if (error) return { error: error.message }
  return { success: true }
}

export async function deletarFotoDb(fotoId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: foto } = await supabase
    .from('diario_fotos')
    .select('storage_path')
    .eq('id', fotoId)
    .single()

  const { error } = await supabase.from('diario_fotos').delete().eq('id', fotoId)
  if (error) return { error: error.message }

  if (foto?.storage_path) {
    const admin = createAdminSupabaseClient()
    await admin.storage.from(BUCKET).remove([foto.storage_path])
  }

  return { success: true }
}

export async function getSignedUrls(paths: string[]) {
  if (paths.length === 0) return { urls: {} }
  const admin = createAdminSupabaseClient()

  const results = await Promise.all(
    paths.map(async (path) => {
      const { data } = await admin.storage.from(BUCKET).createSignedUrl(path, 3600)
      return { path, url: data?.signedUrl ?? null }
    })
  )

  const urls: Record<string, string | null> = {}
  for (const r of results) urls[r.path] = r.url
  return { urls }
}

export async function atualizarLegenda(fotoId: string, legenda: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase
    .from('diario_fotos')
    .update({ legenda: legenda.trim() || null })
    .eq('id', fotoId)
  if (error) return { error: error.message }
  return { success: true }
}
