'use client'

import { useState, useEffect, useRef } from 'react'
import imageCompression from 'browser-image-compression'
import { createClient } from '@/lib/supabase/client'
import {
  ensureBucket,
  salvarFotoDb,
  deletarFotoDb,
  getSignedUrls,
  atualizarLegenda,
} from './fotosActions'
import type { DiarioFoto } from '@/types/supabase'

const BUCKET = 'diario-fotos'

interface FotoWithUrl extends DiarioFoto {
  signedUrl: string | null
}

interface Props {
  obraId: string
  diarioId: string | undefined
  isAprovado: boolean
}

export default function FotosSection({ obraId, diarioId, isAprovado }: Props) {
  const [fotos, setFotos] = useState<FotoWithUrl[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<FotoWithUrl | null>(null)
  const [editingLegenda, setEditingLegenda] = useState<{ id: string; value: string } | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!diarioId) { setLoading(false); return }
    loadFotos()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diarioId])

  async function loadFotos() {
    setLoading(true)
    const supabase = createClient()
    const { data, error: fetchErr } = await supabase
      .from('diario_fotos')
      .select('*')
      .eq('diario_id', diarioId!)
      .order('ordem')

    if (fetchErr || !data) { setLoading(false); return }

    const paths = data.map((f) => f.storage_path)
    const { urls } = await getSignedUrls(paths)

    setFotos(data.map((f) => ({ ...f, signedUrl: urls[f.storage_path] ?? null })))
    setLoading(false)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || !diarioId) return
    setError('')
    setUploading(true)

    await ensureBucket()

    const supabase = createClient()
    const erros: string[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        const compressed = await imageCompression(file, {
          maxSizeMB: 0.8,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        })

        const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase()
        const path = `${obraId}/${diarioId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

        const { error: uploadErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, compressed, { contentType: compressed.type })

        if (uploadErr) {
          erros.push(`${file.name}: ${uploadErr.message}`)
          continue
        }

        const res = await salvarFotoDb(diarioId, path, '', fotos.length + i)
        if (res?.error) {
          erros.push(res.error)
          await supabase.storage.from(BUCKET).remove([path])
        }
      } catch {
        erros.push(`Erro ao processar ${file.name}`)
      }
    }

    if (erros.length) setError(erros.join(' | '))
    if (inputRef.current) inputRef.current.value = ''
    setUploading(false)
    await loadFotos()
  }

  async function handleDelete(foto: FotoWithUrl) {
    setDeleting(foto.id)
    await deletarFotoDb(foto.id)
    setPreview(null)
    setDeleting(null)
    await loadFotos()
  }

  async function handleSaveLegenda() {
    if (!editingLegenda) return
    await atualizarLegenda(editingLegenda.id, editingLegenda.value)
    setEditingLegenda(null)
    await loadFotos()
  }

  if (!diarioId) {
    return (
      <div className="text-center py-8 rounded-xl" style={{ color: '#475569', border: '2px dashed rgba(255,255,255,0.12)' }}>
        <p className="text-2xl mb-1">📷</p>
        <p className="text-sm">Salve o diário primeiro para habilitar o upload de fotos</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-gray-400">
        Carregando fotos...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {!isAprovado && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            multiple
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-full py-6 rounded-xl flex flex-col items-center gap-1.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ border: '2px dashed rgba(220,38,38,0.35)', color: '#dc2626' }}
          >
            <span className="text-2xl">{uploading ? '⏳' : '📷'}</span>
            <span className="text-sm font-medium">{uploading ? 'Comprimindo e enviando...' : 'Clique para adicionar fotos'}</span>
            <span className="text-xs" style={{ color: '#475569' }}>JPG · PNG · WEBP · HEIC · Múltiplos arquivos · Compressão automática</span>
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </>
      )}

      {fotos.length === 0 && isAprovado && (
        <p className="text-sm text-gray-400 text-center py-4">Nenhuma foto registrada neste diário.</p>
      )}

      {fotos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {fotos.map((foto) => (
            <div
              key={foto.id}
              className="group relative rounded-xl overflow-hidden aspect-square cursor-pointer ring-0 hover:ring-2 hover:ring-red-400 transition-all" style={{ background: 'rgba(255,255,255,0.05)' }}
              onClick={() => setPreview(foto)}
            >
              {foto.signedUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={foto.signedUrl}
                  alt={foto.legenda ?? 'Foto da obra'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 text-3xl">📷</div>
              )}
              {foto.legenda && (
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent text-white text-[10px] px-2 py-1.5 truncate">
                  {foto.legenda}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => { setPreview(null); setEditingLegenda(null) }}
        >
          <div
            className="relative w-full max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            {preview.signedUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview.signedUrl}
                alt={preview.legenda ?? ''}
                className="w-full max-h-[75vh] object-contain rounded-xl"
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400">Imagem indisponível</div>
            )}

            <div className="mt-3">
              {editingLegenda?.id === preview.id ? (
                <div className="flex gap-2">
                  <input
                    value={editingLegenda.value}
                    onChange={(e) => setEditingLegenda({ ...editingLegenda, value: e.target.value })}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm placeholder-gray-400 border border-white/20 focus:outline-none focus:border-red-400"
                    placeholder="Legenda da foto..."
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveLegenda(); if (e.key === 'Escape') setEditingLegenda(null) }}
                  />
                  <button onClick={handleSaveLegenda} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg font-medium">
                    Salvar
                  </button>
                  <button onClick={() => setEditingLegenda(null)} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg">
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-white/70 text-sm flex-1 text-center">
                    {preview.legenda || <span className="italic text-white/40">Sem legenda</span>}
                  </p>
                  {!isAprovado && (
                    <button
                      onClick={() => setEditingLegenda({ id: preview.id, value: preview.legenda ?? '' })}
                      className="text-white/40 hover:text-white/80 text-xs"
                    >
                      ✏️
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="absolute top-2 right-2 flex gap-2">
              {!isAprovado && (
                <button
                  onClick={() => handleDelete(preview)}
                  disabled={deleting === preview.id}
                  className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white text-xs rounded-lg font-medium disabled:opacity-60"
                >
                  {deleting === preview.id ? '...' : '🗑️ Excluir'}
                </button>
              )}
              <button
                onClick={() => { setPreview(null); setEditingLegenda(null) }}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs rounded-lg"
              >
                ✕ Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
