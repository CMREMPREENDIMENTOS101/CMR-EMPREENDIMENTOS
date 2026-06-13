import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/AppShell'

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
    .select('nome, perfil, empresa_id')
    .eq('id', user.id)
    .single()

  if (!usuario) redirect('/login')

  let logoUrl: string | null = null
  if (usuario.empresa_id) {
    const { data: empresa } = await supabase
      .from('empresas')
      .select('logo_url')
      .eq('id', usuario.empresa_id)
      .single()
    logoUrl = empresa?.logo_url ?? null
  } else {
    const { data: empresa } = await supabase
      .from('empresas')
      .select('logo_url')
      .limit(1)
      .maybeSingle()
    logoUrl = empresa?.logo_url ?? null
  }

  return (
    <AppShell nome={usuario.nome} perfil={usuario.perfil} logoUrl={logoUrl}>
      {children}
    </AppShell>
  )
}
