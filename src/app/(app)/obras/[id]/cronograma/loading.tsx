const S = ({ w, h = 14, r = 8 }: { w: number | string; h?: number; r?: number }) => (
  <div style={{ width: w, height: h, borderRadius: r, background: 'rgba(255,255,255,0.06)' }} />
)

export default function CronogramaLoading() {
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <S w={220} h={22} />
      <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '10px 16px', gap: 16 }}>
          <S w={200} h={14} />
          <div style={{ flex: 1, display: 'flex', gap: 8 }}>
            {Array.from({ length: 6 }).map((_, i) => <S key={i} w="100%" h={14} />)}
          </div>
        </div>
        {/* Linhas */}
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '0 16px', height: 52 }}>
            <div style={{ width: 200, flexShrink: 0 }}>
              <S w={140} h={12} />
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              <div style={{
                position: 'absolute', height: 10, borderRadius: 99,
                background: 'rgba(220,38,38,0.2)',
                left: `${8 + i * 5}%`, width: `${20 + (i % 3) * 12}%`, top: '50%', transform: 'translateY(-50%)',
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
