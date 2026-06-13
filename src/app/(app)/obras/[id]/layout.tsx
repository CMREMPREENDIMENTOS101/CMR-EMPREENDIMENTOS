import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
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
    <div style={{ display: 'flex', minHeight: '100vh', background: '#111827' }}>
      <ObraSidebar
        obraId={id}
        obraNome={obra.nome}
        totalRelatorios={totalRelatorios ?? 0}
        logoUrl={logoUrl}
        isAdmin={usuarioRow?.perfil === 'admin'}
      />

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <div style={{
          background: '#0f172a',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          padding: '10px 20px',
          display: 'flex', alignItems: 'center', gap: 10,
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          <Link
            href="/obras"
            style={{ display: 'flex', alignItems: 'center', color: '#64748b', textDecoration: 'none' }}
          >
            <i className="material-icons" style={{ fontSize: 22 }}>arrow_back</i>
          </Link>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9' }}>{obra.nome}</span>
          <Link
            href={`/obras/${id}/diario/${hoje}`}
            style={{
              marginLeft: 'auto',
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px',
              background: '#dc2626', color: '#fff',
              borderRadius: 6, textDecoration: 'none',
              fontSize: 13, fontWeight: 600,
            }}
          >
            <i className="material-icons" style={{ fontSize: 18 }}>add</i>
            Novo Relatório
          </Link>
        </div>

        {children}
      </div>
    </div>
  )
}
