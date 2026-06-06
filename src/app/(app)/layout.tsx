import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('nome, perfil')
    .eq('id', user.id)
    .single()

  if (!usuario) redirect('/login')

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar nome={usuario.nome} perfil={usuario.perfil} />

      {/* Conteúdo principal — offset pela sidebar no desktop */}
      <main className="flex-1 md:ml-56 pb-16 md:pb-0 min-w-0">
        {children}
      </main>
    </div>
  )
}
