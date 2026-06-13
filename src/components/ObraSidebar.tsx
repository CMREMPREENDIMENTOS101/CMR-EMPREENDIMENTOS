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
}

export default function ObraSidebar({ obraId, obraNome, totalRelatorios, logoUrl, isAdmin = false }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const [modalOpen, setModalOpen]     = useState(false)
  const [hovering, setHovering]       = useState(false)
  const [currentLogo, setCurrentLogo] = useState<string | null>(logoUrl ?? null)

  const isVisaoGeral = pathname === `/obras/${obraId}`
  const isRelatorios = pathname.startsWith(`/obras/${obraId}/relatorios`)
  const isDiario     = pathname.startsWith(`/obras/${obraId}/diario`)

  const items = [
    { href: `/obras/${obraId}`,            label: 'Visão geral',      icon: 'grid_view',     count: null,            active: isVisaoGeral },
    { href: `/obras/${obraId}/diario`,     label: 'Lista de tarefas', icon: 'list_alt',      count: null,            active: isDiario     },
    { href: `/obras/${obraId}/relatorios`, label: 'Relatórios',       icon: 'content_paste', count: totalRelatorios, active: isRelatorios },
  ]

  function handleNav(href: string) {
    setPendingHref(href)
    router.push(href)
  }

  return (
    <>
      <aside style={{
        width: 260, minWidth: 260,
        background: '#0f172a',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Logo — clicável para admins */}
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '12px 16px', minHeight: 150,
            borderBottom: '1px solid rgba(255,255,255,0.07)',
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
              maxHeight: 120, maxWidth: 230, objectFit: 'contain',
              transition: 'opacity 0.2s',
              opacity: hovering ? 0.35 : 1,
            }}
          />

          {isAdmin && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 4,
              opacity: hovering ? 1 : 0,
              transition: 'opacity 0.2s',
              pointerEvents: 'none',
            }}>
              <i className="material-icons" style={{ fontSize: 24, color: '#dc2626' }}>photo_camera</i>
              <span style={{ fontSize: 10, color: '#dc2626', fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase' }}>
                Alterar logo
              </span>
            </div>
          )}
        </div>

        {/* Nome da obra */}
        <div style={{
          margin: '10px 12px 0',
          padding: '10px 12px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 6, textAlign: 'center',
        }}>
          <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, lineHeight: 1.4, display: 'block' }}>
            {obraNome}
          </span>
        </div>

        {/* Nav */}
        <nav style={{ paddingTop: 8 }}>
          {items.map((item) => {
            const isPending = pendingHref === item.href && !item.active
            const isActive  = item.active || isPending

            return (
              <button
                key={item.label}
                onClick={() => handleNav(item.href)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '11px 16px',
                  background: isActive ? 'rgba(220,38,38,0.12)' : 'transparent',
                  boxShadow: isActive ? 'inset 3px 0 0 #dc2626' : 'inset 3px 0 0 transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s, box-shadow 0.15s',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: isActive ? '#f1f5f9' : '#64748b' }}>
                  <i className="material-icons" style={{ fontSize: 18, color: isActive ? '#dc2626' : '#475569' }}>
                    {item.icon}
                  </i>
                  {item.label}
                </span>
                {item.count !== null && (
                  <span style={{
                    background: isActive ? '#dc2626' : 'rgba(255,255,255,0.08)',
                    color: isActive ? '#fff' : '#94a3b8',
                    borderRadius: 10, padding: '1px 8px', fontSize: 11,
                  }}>
                    {item.count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
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
