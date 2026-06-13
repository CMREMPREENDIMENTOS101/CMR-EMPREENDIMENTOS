const S = ({ w, h = 16, r = 8 }: { w: number | string; h?: number; r?: number }) => (
  <div style={{ width: w, height: h, borderRadius: r, background: 'rgba(255,255,255,0.06)' }} />
)

export default function ObraDashboardLoading() {
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ background: '#1e293b', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <S w={80} h={11} />
            <S w={60} h={28} r={6} />
          </div>
        ))}
      </div>
      {/* Chart + ocorrências */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', padding: '16px 20px', height: 200 }} />
        <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array.from({ length: 4 }).map((_, i) => <S key={i} w="100%" h={14} />)}
        </div>
      </div>
      {/* Etapas + Diários */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <S w={140} h={12} />
              <S w="100%" h={8} r={99} />
            </div>
          ))}
        </div>
        <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array.from({ length: 5 }).map((_, i) => <S key={i} w="100%" h={14} />)}
        </div>
      </div>
    </div>
  )
}
