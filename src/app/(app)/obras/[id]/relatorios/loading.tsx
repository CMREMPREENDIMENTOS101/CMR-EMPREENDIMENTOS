const S = ({ w, h = 14, r = 8 }: { w: number | string; h?: number; r?: number }) => (
  <div style={{ width: w, height: h, borderRadius: r, background: 'rgba(255,255,255,0.06)' }} />
)

export default function RelatoriosLoading() {
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <S w={220} h={22} />
        <S w={160} h={14} />
      </div>
      {/* Filtros */}
      <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', padding: '16px 20px', display: 'flex', gap: 12 }}>
        <S w="100%" h={36} r={8} />
        <S w="100%" h={36} r={8} />
        <S w={120} h={36} r={8} />
      </div>
      {/* Tabela */}
      <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <S w={140} h={14} />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <S w={160} h={14} />
            <S w={64} h={22} r={99} />
          </div>
        ))}
      </div>
    </div>
  )
}
