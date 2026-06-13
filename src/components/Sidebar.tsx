'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { logout } from '@/app/login/actions'
import LogoUploadModal from './LogoUploadModal'
import type { PerfilGlobal } from '@/types/supabase'

interface Props {
  nome: string
  perfil: PerfilGlobal
  logoUrl?: string | null
}

const navItems = [
  {
    href: '/obras',
    label: 'Obras',
    icon: '🏗️',
    perfis: ['admin', 'engenheiro', 'encarregado'] as PerfilGlobal[],
  },
  {
    href: '/admin/usuarios',
    label: 'Usuários',
    icon: '👥',
    perfis: ['admin'] as PerfilGlobal[],
  },
  {
    href: '/configuracoes',
    label: 'Configurações',
    icon: '⚙️',
    perfis: ['admin'] as PerfilGlobal[],
  },
]

const PERFIL_LABEL: Record<PerfilGlobal, string> = {
  admin: 'Administrador',
  engenheiro: 'Engenheiro',
  encarregado: 'Encarregado',
}

export default function Sidebar({ nome, perfil, logoUrl }: Props) {
  const pathname = usePathname()
  const visibleItems = navItems.filter((item) => item.perfis.includes(perfil))
  const isAdmin = perfil === 'admin'

  const [modalOpen, setModalOpen]     = useState(false)
  const [hovering, setHovering]       = useState(false)
  const [currentLogo, setCurrentLogo] = useState<string | null>(logoUrl ?? null)

  return (
    <>
      {/* ── Sidebar desktop ── */}
      <aside className="hidden md:flex flex-col w-56 min-h-screen fixed top-0 left-0 z-30"
        style={{ background: '#0f172a', borderRight: '1px solid rgba(255,255,255,0.07)' }}>

        {/* Logo — clicável para admins */}
        <div
          className="flex items-center justify-center px-4 py-4"
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            minHeight: 150,
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
              maxHeight: 120, maxWidth: 200, objectFit: 'contain',
              transition: 'opacity 0.2s',
              opacity: hovering ? 0.35 : 1,
            }}
          />

          {/* Overlay câmera (admin hover) */}
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

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {visibleItems.map((item) => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: active ? 'rgba(220,38,38,0.15)' : 'transparent',
                  color: active ? '#dc2626' : '#94a3b8',
                }}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User + logout */}
        <div className="px-3 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="px-3 py-2 mb-1">
            <p className="text-sm font-medium truncate" style={{ color: '#f1f5f9' }}>{nome}</p>
            <p className="text-xs" style={{ color: '#64748b' }}>{PERFIL_LABEL[perfil]}</p>
          </div>
          <form action={logout}>
            <button type="submit" className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors"
              style={{ color: '#64748b' }}>
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* ── Bottom nav mobile ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex"
        style={{ background: '#0f172a', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        {visibleItems.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href}
              className="flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium"
              style={{ color: active ? '#dc2626' : '#64748b' }}>
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Modal de upload de logo */}
      <LogoUploadModal
        currentLogoUrl={currentLogo}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={(url) => setCurrentLogo(url)}
      />
    </>
  )
}
