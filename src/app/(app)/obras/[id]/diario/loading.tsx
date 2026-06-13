const S = ({ w, h = 14, r = 8 }: { w: number | string; h?: number; r?: number }) => (
  <div style={{ width: w, height: h, borderRadius: r, background: 'rgba(255,255,255,0.06)' }} />
)

export default function DiarioCalendarLoading() {
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Nav mês */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <S w={32} h={32} r={8} />
        <S w={140} h={20} />
        <S w={32} h={32} r={8} />
      </div>
      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8 }}>
        {Array.from({ length: 3 }).map((_, i) => <S key={i} w={90} h={26} r={99} />)}
      </div>
      {/* Calendário */}
      <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
          {Array.from({ length: 7 }).map((_, i) => <S key={i} w="100%" h={12} />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} style={{ height: 40, borderRadius: 8, background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      </div>
    </div>
  )
}
