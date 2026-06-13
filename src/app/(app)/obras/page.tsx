import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { ObraStatus } from '@/types/supabase'

const STATUS_CONFIG: Record<
  ObraStatus,
  { label: string; badge: string; dot: string }
> = {
  em_andamento: {
    label: 'Em andamento',
    badge: 'bg-green-100 text-green-700',
    dot: 'bg-green-500',
  },
  paralisada: {
    label: 'Paralisada',
    badge: 'bg-yellow-100 text-yellow-700',
    dot: 'bg-yellow-500',
  },
  concluida: {
    label: 'Concluída',
    badge: 'bg-gray-100 text-gray-600',
    dot: 'bg-gray-400',
  },
}

export default async function ObrasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status: filtroStatus } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: meuPerfil } = await supabase
    .from('usuarios')
    .select('perfil')
    .eq('id', user.id)
    .single()

  let obrasQuery = supabase
    .from('obras')
    .select('id, nome, endereco, status, data_inicio, created_at')
    .order('created_at', { ascending: false })

  if (filtroStatus) obrasQuery = obrasQuery.eq('status', filtroStatus as ObraStatus)
  const { data: obras } = await obrasQuery

  if (!obras || obras.length === 0) {
    const isAdmin = meuPerfil?.perfil === 'admin'
    return (
      <div className="p-6">
        <Header isAdmin={isAdmin} />
        <Filtros filtroStatus={filtroStatus} />
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🏗️</p>
          <p className="font-medium">Nenhuma obra encontrada</p>
          {isAdmin && (
            <Link href="/obras/nova" className="mt-4 inline-block text-red-600 text-sm font-medium">
              Criar primeira obra →
            </Link>
          )}
        </div>
      </div>
    )
  }

  const obraIds = obras.map((o) => o.id)

  // Buscar % avanço e última atualização em queries separadas
  const [{ data: etapas }, { data: diarios }] = await Promise.all([
    supabase
      .from('etapas')
      .select('obra_id, percentual_real')
      .in('obra_id', obraIds),
    supabase
      .from('diarios')
      .select('obra_id, created_at')
      .in('obra_id', obraIds)
      .order('created_at', { ascending: false }),
  ])

  const avancoPorObra: Record<string, number> = {}
  const ultimaPorObra: Record<string, string> = {}

  for (const obra of obras) {
    const etapasDaObra = etapas?.filter((e) => e.obra_id === obra.id) ?? []
    avancoPorObra[obra.id] =
      etapasDaObra.length > 0
        ? Math.round(
            etapasDaObra.reduce((s, e) => s + e.percentual_real, 0) /
              etapasDaObra.length
          )
        : 0

    const diarioDaObra = diarios?.find((d) => d.obra_id === obra.id)
    ultimaPorObra[obra.id] = diarioDaObra?.created_at ?? obra.created_at
  }

  const isAdmin = meuPerfil?.perfil === 'admin'

  return (
    <div className="p-6">
      <Header isAdmin={isAdmin} />
      <Filtros filtroStatus={filtroStatus} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {obras.map((obra) => {
          const cfg = STATUS_CONFIG[obra.status as ObraStatus]
          const dataInicio = obra.data_inicio
            ? new Date(obra.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR')
            : null
          const ultima = new Date(ultimaPorObra[obra.id]).toLocaleDateString('pt-BR')
          const avanco = avancoPorObra[obra.id]

          return (
            <Link
              key={obra.id}
              href={`/obras/${obra.id}`}
              className="block rounded-xl transition-all p-4 group"
              style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </span>
              </div>

              <h2 className="font-semibold leading-tight mb-1 transition-colors" style={{ color: '#f1f5f9' }}>
                {obra.nome}
              </h2>
              {obra.endereco && (
                <p className="text-xs mb-3 truncate" style={{ color: '#475569' }}>{obra.endereco}</p>
              )}

              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1" style={{ color: '#64748b' }}>
                  <span>Avanço</span>
                  <span className="font-medium" style={{ color: '#94a3b8' }}>{avanco}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                  <div
                    className="h-full bg-red-600 rounded-full transition-all"
                    style={{ width: `${avanco}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-2" style={{ color: '#475569', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {dataInicio && <span>Início: {dataInicio}</span>}
                <span className="ml-auto">Atualizado: {ultima}</span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function Header({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>Obras</h1>
      {isAdmin && (
        <Link
          href="/obras/nova"
          className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          + Nova obra
        </Link>
      )}
    </div>
  )
}

function Filtros({ filtroStatus }: { filtroStatus?: string }) {
  const filtros = [
    { href: '/obras', label: 'Todas' },
    { href: '/obras?status=em_andamento', label: 'Em andamento' },
    { href: '/obras?status=paralisada', label: 'Paralisadas' },
    { href: '/obras?status=concluida', label: 'Concluídas' },
  ]
  return (
    <div className="flex gap-2 mb-6 flex-wrap">
      {filtros.map((f) => {
        const isActive = f.href === '/obras' ? !filtroStatus : f.href.includes(filtroStatus ?? '')
        return (
          <Link
            key={f.href}
            href={f.href}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              isActive
                ? 'bg-red-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {f.label}
          </Link>
        )
      })}
    </div>
  )
}
