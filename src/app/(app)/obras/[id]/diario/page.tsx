import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'

function getDiasDoMes(ano: number, mes: number) {
  const dias: string[] = []
  const total = new Date(ano, mes, 0).getDate()
  for (let d = 1; d <= total; d++) {
    dias.push(`${ano}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }
  return dias
}

export default async function DiarioListPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ mes?: string }>
}) {
  const { id } = await params
  const { mes: mesParam } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: obra } = await supabase.from('obras').select('id, nome').eq('id', id).single()
  if (!obra) notFound()

  // Mês exibido (default: mês atual)
  const hoje = new Date()
  let ano = hoje.getFullYear()
  let mes = hoje.getMonth() + 1

  if (mesParam) {
    const [a, m] = mesParam.split('-').map(Number)
    if (a && m && m >= 1 && m <= 12) { ano = a; mes = m }
  }

  // Busca todos os diários da obra (só id, data, status)
  const { data: diarios } = await supabase
    .from('diarios')
    .select('id, data, status')
    .eq('obra_id', id)
    .order('data', { ascending: false })

  const diarioMap = new Map((diarios ?? []).map((d) => [d.data, d]))

  const dias = getDiasDoMes(ano, mes)

  // Navegação mês anterior / próximo
  const prevDate = new Date(ano, mes - 2, 1)
  const nextDate = new Date(ano, mes, 1)
  const prevMes = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
  const nextMes = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`

  const mesNome = new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const hojeStr = hoje.toISOString().split('T')[0]

  // Dia da semana do 1º dia do mês (0=dom)
  const primeiroDiaSemana = new Date(ano, mes - 1, 1).getDay()

  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  // Estatísticas do mês
  const diariosDoMes = (diarios ?? []).filter((d) => d.data.startsWith(`${ano}-${String(mes).padStart(2, '0')}`))
  const aprovados = diariosDoMes.filter((d) => d.status === 'aprovado').length
  const preenchidos = diariosDoMes.filter((d) => d.status === 'preenchido').length
  const rascunhos = diariosDoMes.filter((d) => d.status === 'rascunho').length

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Link href="/obras" className="hover:text-gray-600">Obras</Link>
          <span>/</span>
          <Link href={`/obras/${id}`} className="hover:text-gray-600">{obra.nome}</Link>
          <span>/</span>
          <span className="text-gray-700 font-medium">Diários</span>
        </div>
      </div>

      {/* Cabeçalho + nav de mês */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900 capitalize">{mesNome}</h1>
        <div className="flex items-center gap-2">
          <Link
            href={`/obras/${id}/diario?mes=${prevMes}`}
            className="p-2 rounded-lg border border-gray-200 hover:border-orange-300 hover:text-orange-600 text-gray-600 text-sm"
          >
            ←
          </Link>
          <Link
            href={`/obras/${id}/diario`}
            className="px-3 py-1.5 rounded-lg border border-gray-200 hover:border-orange-300 hover:text-orange-600 text-gray-600 text-xs font-medium"
          >
            Hoje
          </Link>
          <Link
            href={`/obras/${id}/diario?mes=${nextMes}`}
            className="p-2 rounded-lg border border-gray-200 hover:border-orange-300 hover:text-orange-600 text-gray-600 text-sm"
          >
            →
          </Link>
        </div>
      </div>

      {/* Estatísticas */}
      {diariosDoMes.length > 0 && (
        <div className="flex gap-3 mb-6 flex-wrap">
          <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-medium">{aprovados} aprovado{aprovados !== 1 ? 's' : ''}</span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">{preenchidos} preenchido{preenchidos !== 1 ? 's' : ''}</span>
          {rascunhos > 0 && <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">{rascunhos} rascunho{rascunhos !== 1 ? 's' : ''}</span>}
        </div>
      )}

      {/* Grade do calendário */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header dias semana */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {diasSemana.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-gray-400">
              {d}
            </div>
          ))}
        </div>

        {/* Células */}
        <div className="grid grid-cols-7">
          {/* Espaços vazios antes do 1º dia */}
          {Array.from({ length: primeiroDiaSemana }).map((_, i) => (
            <div key={`empty-${i}`} className="h-16 border-b border-r border-gray-50 last:border-r-0" />
          ))}

          {dias.map((dia, idx) => {
            const diario = diarioMap.get(dia)
            const isHoje = dia === hojeStr
            const col = (primeiroDiaSemana + idx) % 7
            const isSunday = col === 0
            const isSaturday = col === 6

            let cellBg = ''
            let indicator = null

            if (diario) {
              if (diario.status === 'aprovado') {
                cellBg = 'bg-green-50 hover:bg-green-100'
                indicator = <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
              } else if (diario.status === 'preenchido') {
                cellBg = 'bg-blue-50 hover:bg-blue-100'
                indicator = <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
              } else {
                cellBg = 'bg-amber-50 hover:bg-amber-100'
                indicator = <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
              }
            } else {
              cellBg = 'hover:bg-orange-50'
            }

            const dayNum = parseInt(dia.split('-')[2])
            const label = isSunday || isSaturday ? 'text-gray-400' : 'text-gray-700'

            return (
              <Link
                key={dia}
                href={`/obras/${id}/diario/${dia}`}
                className={`h-16 border-b border-r border-gray-100 last:border-r-0 p-2 flex flex-col justify-between transition-colors ${cellBg}`}
              >
                <div className="flex items-start justify-between">
                  <span
                    className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                      isHoje
                        ? 'bg-orange-500 text-white'
                        : label
                    }`}
                  >
                    {dayNum}
                  </span>
                  {indicator}
                </div>
                {diario && (
                  <span className="text-[10px] text-gray-400 leading-none">
                    {diario.status === 'aprovado' ? 'Aprovado' : diario.status === 'preenchido' ? 'Preenchido' : 'Rascunho'}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex gap-4 mt-4 justify-end flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Aprovado
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Preenchido
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Rascunho
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-200" /> Sem registro
        </div>
      </div>

      {/* Lista dos últimos diários do mês */}
      {diariosDoMes.length > 0 && (
        <div className="mt-6 bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          <div className="px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-700">Registros do mês</h2>
          </div>
          {diariosDoMes.map((d) => (
            <Link
              key={d.id}
              href={`/obras/${id}/diario/${d.data}`}
              className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm text-gray-700">
                {new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR', {
                  weekday: 'short', day: '2-digit', month: '2-digit',
                })}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                d.status === 'aprovado'
                  ? 'bg-green-100 text-green-700'
                  : d.status === 'preenchido'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {d.status === 'aprovado' ? 'Aprovado' : d.status === 'preenchido' ? 'Preenchido' : 'Rascunho'}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* Atalho novo diário */}
      <div className="mt-4">
        <Link
          href={`/obras/${id}/diario/${hojeStr}`}
          className="flex items-center justify-center w-full py-3 border-2 border-dashed border-orange-200 rounded-xl text-sm text-orange-500 hover:bg-orange-50 transition-colors font-medium"
        >
          + Registrar diário de hoje
        </Link>
      </div>
    </div>
  )
}
