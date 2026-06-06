'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/login/actions'
import type { PerfilGlobal } from '@/types/supabase'

interface Props {
  nome: string
  perfil: PerfilGlobal
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
]

const PERFIL_LABEL: Record<PerfilGlobal, string> = {
  admin: 'Administrador',
  engenheiro: 'Engenheiro',
  encarregado: 'Encarregado',
}

export default function Sidebar({ nome, perfil }: Props) {
  const pathname = usePathname()

  const visibleItems = navItems.filter((item) => item.perfis.includes(perfil))

  return (
    <>
      {/* ── Sidebar desktop ── */}
      <aside className="hidden md:flex flex-col w-56 min-h-screen bg-white border-r border-gray-200 fixed top-0 left-0 z-30">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-gray-100">
          <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xs">CMR</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">Diário de Obras</p>
            <p className="text-xs text-gray-400 truncate">CMR Empreendimentos</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {visibleItems.map((item) => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-orange-50 text-orange-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User + logout */}
        <div className="px-3 py-4 border-t border-gray-100">
          <div className="px-3 py-2 mb-1">
            <p className="text-sm font-medium text-gray-900 truncate">{nome}</p>
            <p className="text-xs text-gray-400">{PERFIL_LABEL[perfil]}</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
            >
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* ── Bottom nav mobile ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 flex">
        {visibleItems.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
                active ? 'text-orange-600' : 'text-gray-500'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
