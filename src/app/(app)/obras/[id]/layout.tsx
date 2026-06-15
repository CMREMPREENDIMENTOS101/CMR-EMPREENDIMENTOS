import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ObraSidebar from '@/components/ObraSidebar'

export default async function ObraLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: obra }, { count: totalRelatorios }, { data: usuarioRow }] = await Promise.all([
    supabase.from('obras').select('id, nome').eq('id', id).single(),
    supabase.from('diarios').select('*', { count: 'exact', head: true }).eq('obra_id', id),
    user
      ? supabase.from('usuarios').select('empresa_id, perfil').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
  ])

  let logoUrl: string | null = null
  if (usuarioRow?.empresa_id) {
    const { data: empresa } = await supabase
      .from('empresas')
      .select('logo_url')
      .eq('id', usuarioRow.empresa_id)
      .single()
    logoUrl = empresa?.logo_url ?? null
  }

  if (!obra) notFound()

  const hoje = new Date().toISOString().split('T')[0]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f3f4f6' }}>
      <ObraSidebar
        obraId={id}
        obraNome={obra.nome}
        totalRelatorios={totalRelatorios ?? 0}
        logoUrl={logoUrl}
        isAdmin={usuarioRow?.perfil === 'admin'}
        diarioHoje={hoje}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        {children}
      </div>
    </div>
  )
}
