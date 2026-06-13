'use client'

import { useState, useRef } from 'react'
import { uploadLogo } from './actions'

interface Props {
  currentLogoUrl: string | null
}

export default function LogoUploadClient({ currentLogoUrl }: Props) {
  const [preview, setPreview]   = useState<string | null>(null)
  const [file, setFile]         = useState<File | null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState(false)
  const [savedUrl, setSavedUrl] = useState<string | null>(currentLogoUrl)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setError(null)
    setSuccess(false)
    setPreview(URL.createObjectURL(f))
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (!f) return
    setFile(f)
    setError(null)
    setSuccess(false)
    setPreview(URL.createObjectURL(f))
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
    } else {
      setSavedUrl(result.url ?? null)
      setSuccess(true)
      setPreview(null)
      setFile(null)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const displayUrl = preview ?? savedUrl ?? '/logo-cmr.svg'

  return (
    <div style={{ maxWidth: 480 }}>
      <div style={{
        background: '#1e293b',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: 24,
      }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 600, color: '#f1f5f9' }}>
          Logo da Empresa
        </h2>

        {/* Preview */}
        <div style={{
          background: '#0f172a',
          borderRadius: 8,
          padding: 24,
          textAlign: 'center',
          marginBottom: 20,
          border: '1px solid rgba(255,255,255,0.07)',
          minHeight: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displayUrl}
            alt="Logo"
            style={{ maxHeight: 80, maxWidth: '100%', objectFit: 'contain' }}
          />
        </div>

        {/* Drop zone */}
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          style={{
            border: `2px dashed ${file ? '#dc2626' : 'rgba(220,38,38,0.35)'}`,
            borderRadius: 8,
            padding: '24px 16px',
            textAlign: 'center',
            cursor: 'pointer',
            marginBottom: 16,
            transition: 'border-color 0.2s',
          }}
        >
          <i className="material-icons" style={{
            fontSize: 36, color: '#dc2626', opacity: 0.7,
            display: 'block', marginBottom: 8,
          }}>
            cloud_upload
          </i>
          <p style={{ margin: 0, fontSize: 14, color: '#cbd5e1', fontWeight: 500 }}>
            {file ? file.name : 'Clique ou arraste uma imagem aqui'}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
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
          <p style={{ color: '#ef4444', fontSize: 13, margin: '0 0 12px' }}>{error}</p>
        )}
        {success && (
          <p style={{ color: '#16a34a', fontSize: 13, margin: '0 0 12px' }}>
            ✓ Logo atualizado com sucesso! Recarregue a página para ver nas barras laterais.
          </p>
        )}

        <button
          type="button"
          onClick={handleUpload}
          disabled={!file || loading}
          style={{
            width: '100%',
            padding: '10px 16px',
            background: file && !loading ? '#dc2626' : '#334155',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: file && !loading ? 'pointer' : 'not-allowed',
            transition: 'background 0.2s',
          }}
        >
          {loading ? 'Enviando...' : 'Salvar Logo'}
        </button>
      </div>
    </div>
  )
}
