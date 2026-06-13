const S = ({ w, h = 14, r = 8 }: { w: number | string; h?: number; r?: number }) => (
  <div style={{ width: w, height: h, borderRadius: r, background: 'rgba(255,255,255,0.06)' }} />
)

export default function DiarioFormLoading() {
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <S w={200} h={22} />
        <S w={80} h={22} r={99} />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ background: '#1e293b', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <S w={120} h={11} />
          <S w="100%" h={14} />
          <S w="75%" h={14} />
          {i < 2 && <S w="50%" h={14} />}
        </div>
      ))}
      <S w="100%" h={42} r={10} />
    </div>
  )
}
