'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import LogoUploadModal from './LogoUploadModal'

interface Props {
  obraId: string
  obraNome: string
  totalRelatorios: number
  logoUrl?: string | null
  isAdmin?: boolean
  diarioHoje: string
}

export default function ObraSidebar({
  obraId, obraNome, totalRelatorios, logoUrl, isAdmin = false, diarioHoje,
}: Props) {
  const pathname = usePathname()
  const router   = useRouter()

  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const [modalOpen, setModalOpen]     = useState(false)
  const [hovering, setHovering]       = useState(false)
  const [currentLogo, setCurrentLogo] = useState<string | null>(logoUrl ?? null)

  const isVisaoGeral = pathname === `/obras/${obraId}`
  const isDiario     = pathname.startsWith(`/obras/${obraId}/diario`)
  const isRelatorios = pathname.startsWith(`/obras/${obraId}/relatorios`)

  const items = [
    { href: `/obras/${obraId}`,            label: 'Visão geral',     icon: 'grid_view',     count: null,            active: isVisaoGeral },
    { href: `/obras/${obraId}/diario`,     label: 'Diário de obras', icon: 'calendar_today',count: totalRelatorios, active: isDiario     },
    { href: `/obras/${obraId}/relatorios`, label: 'Relatórios',      icon: 'description',   count: null,            active: isRelatorios },
  ]

  function handleNav(href: string) {
    setPendingHref(href)
    router.push(href)
  }

  return (
    <>
      <aside style={{
        width: 260, minWidth: 260,
        background: '#fff',
        borderRight: '1px solid #e5e7eb',
        display: 'flex', flexDirection: 'column',
        height: '100vh',
        position: 'sticky', top: 0,
        overflowY: 'auto',
      }}>

        {/* Back + obra name */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 16px',
          borderBottom: '1px solid #f3f4f6',
        }}>
          <Link
            href="/obras"
            style={{ display: 'flex', alignItems: 'center', color: '#9ca3af', textDecoration: 'none', flexShrink: 0 }}
          >
            <i className="material-icons" style={{ fontSize: 20 }}>arrow_back</i>
          </Link>
          <span style={{
            fontSize: 13, fontWeight: 600, color: '#111827', lineHeight: 1.35,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}>
            {obraNome}
          </span>
        </div>

        {/* Logo */}
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px', minHeight: 120,
            borderBottom: '1px solid #f3f4f6',
            position: 'relative',
            cursor: isAdmin ? 'pointer' : 'default',
          }}
          onClick={() => isAdmin && setModalOpen(true)}
          onMouseEnter={() => isAdmin && setHovering(true)}
          onMouseLeave={() => setHovering(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentLogo ?? '/logo-cmr.svg'}
            alt="CMR Empreendimentos"
            style={{
              maxHeight: 88, maxWidth: 210, objectFit: 'contain',
              opacity: hovering ? 0.3 : 1,
              transition: 'opacity 0.2s',
            }}
          />
          {isAdmin && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 4,
              opacity: hovering ? 1 : 0, transition: 'opacity 0.2s',
              pointerEvents: 'none',
            }}>
              <i className="material-icons" style={{ fontSize: 22, color: '#dc2626' }}>photo_camera</i>
              <span style={{ fontSize: 10, color: '#dc2626', fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase' }}>
                Alterar logo
              </span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ padding: '6px 0', flex: 1 }}>
          {items.map((item) => {
            const isPending = pendingHref === item.href && !item.active
            const isActive  = item.active || isPending
            return (
              <button
                key={item.label}
                onClick={() => handleNav(item.href)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '10px 16px',
                  background: isActive ? '#eff6ff' : 'transparent',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  transition: 'background 0.15s',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: isActive ? '#1d4ed8' : '#6b7280' }}>
                  <i className="material-icons" style={{ fontSize: 18, color: isActive ? '#2563eb' : '#9ca3af' }}>
                    {item.icon}
                  </i>
                  {item.label}
                </span>
                {item.count !== null && item.count > 0 && (
                  <span style={{
                    background: isActive ? '#2563eb' : '#e5e7eb',
                    color: isActive ? '#fff' : '#6b7280',
                    borderRadius: 10, padding: '1px 8px',
                    fontSize: 11, fontWeight: 600,
                    minWidth: 20, textAlign: 'center',
                  }}>
                    {item.count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Novo Relatório */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #f3f4f6' }}>
          <Link
            href={`/obras/${obraId}/diario/${diarioHoje}`}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '10px 16px',
              background: '#dc2626', color: '#fff',
              borderRadius: 8, textDecoration: 'none',
              fontSize: 13, fontWeight: 600,
            }}
          >
            <i className="material-icons" style={{ fontSize: 18 }}>add</i>
            Novo Relatório
          </Link>
        </div>
      </aside>

      <LogoUploadModal
        currentLogoUrl={currentLogo}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={(url) => setCurrentLogo(url)}
      />
    </>
  )
}
