'use client'

import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import type { PerfilGlobal } from '@/types/supabase'

interface Props {
  nome: string
  perfil: PerfilGlobal
  logoUrl?: string | null
  children: React.ReactNode
}

const OBRA_DETAIL = /^\/obras\/[^/]+/

export default function AppShell({ nome, perfil, logoUrl, children }: Props) {
  const pathname = usePathname()
  const isObraDetail = OBRA_DETAIL.test(pathname)

  return (
    <div className={`flex min-h-screen${isObraDetail ? '' : ' bg-[#111827]'}`}>
      {!isObraDetail && <Sidebar nome={nome} perfil={perfil} logoUrl={logoUrl} />}
      <main className={`flex-1 min-w-0 pb-16 md:pb-0${isObraDetail ? '' : ' md:ml-56'}`}>
        {children}
      </main>
    </div>
  )
}
