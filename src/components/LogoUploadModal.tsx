'use client'

import { useState, useRef, useEffect } from 'react'
import { uploadLogo } from '@/app/(app)/configuracoes/actions'

interface Props {
  currentLogoUrl: string | null
  open: boolean
  onClose: () => void
  onSuccess: (url: string) => void
}

export default function LogoUploadModal({ currentLogoUrl, open, onClose, onSuccess }: Props) {
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile]       = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) {
      setPreview(null)
      setFile(null)
      setError(null)
      setLoading(false)
    }
  }, [open])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  function handleFile(f: File) {
    setFile(f)
    setError(null)
    setPreview(URL.createObjectURL(f))
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  async function handleUpload() {
    if (!file) return
    setLoading(true)
    setError(null)
    const fd = new FormData()
    fd.append('logo', file)
    const result = await uploadLogo(fd)
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else if (result.url) {
      onSuccess(result.url)
      onClose()
    }
  }

  const displayUrl = preview ?? currentLogoUrl ?? '/logo-cmr.svg'

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(3px)',
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 9999,
        width: 420, maxWidth: 'calc(100vw - 32px)',
        background: '#1e293b',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 16,
        padding: 28,
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>
            Atualizar Logo
          </h2>
          <button type="button" onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#64748b', display: 'flex', padding: 4, borderRadius: 6,
          }}>
            <i className="material-icons" style={{ fontSize: 20 }}>close</i>
          </button>
        </div>

        {/* Preview atual */}
        <div style={{
          background: '#0f172a',
          borderRadius: 10,
          padding: 20,
          textAlign: 'center',
          marginBottom: 18,
          border: '1px solid rgba(255,255,255,0.07)',
          minHeight: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displayUrl}
            alt="Logo"
            style={{ maxHeight: 72, maxWidth: '100%', objectFit: 'contain' }}
          />
        </div>

        {/* Drop zone */}
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          style={{
            border: `2px dashed ${dragging ? '#dc2626' : file ? 'rgba(220,38,38,0.6)' : 'rgba(255,255,255,0.15)'}`,
            borderRadius: 10,
            padding: '22px 16px',
            textAlign: 'center',
            cursor: 'pointer',
            marginBottom: 14,
            transition: 'all 0.2s',
            background: dragging ? 'rgba(220,38,38,0.06)' : 'transparent',
          }}
        >
          <i className="material-icons" style={{
            fontSize: 38, color: file ? '#dc2626' : '#475569',
            display: 'block', marginBottom: 8,
            transition: 'color 0.2s',
          }}>
            cloud_upload
          </i>
          <p style={{ margin: 0, fontSize: 14, color: file ? '#f1f5f9' : '#94a3b8', fontWeight: 500 }}>
            {file ? file.name : 'Clique ou arraste a imagem aqui'}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#475569' }}>
            PNG, JPG, WebP ou SVG · Máx. 2 MB
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/svg+xml"
          style={{ display: 'none' }}
          onChange={handleChange}
        />

        {error && (
          <p style={{ margin: '0 0 12px', color: '#ef4444', fontSize: 13 }}>{error}</p>
        )}

        {/* Botões */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={onClose} style={{
            flex: 1, padding: '10px 16px',
            background: 'rgba(255,255,255,0.06)',
            color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer',
          }}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || loading}
            style={{
              flex: 2, padding: '10px 16px',
              background: file && !loading ? '#dc2626' : '#334155',
              color: '#fff', border: 'none',
              borderRadius: 8, fontSize: 14, fontWeight: 600,
              cursor: file && !loading ? 'pointer' : 'not-allowed',
              transition: 'background 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {loading
              ? <><i className="material-icons" style={{ fontSize: 16, animation: 'spin 1s linear infinite' }}>refresh</i> Enviando...</>
              : <><i className="material-icons" style={{ fontSize: 16 }}>save</i> Salvar Logo</>
            }
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}
