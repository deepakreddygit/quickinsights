import React from 'react'

type Props = {
  columns: string[]
  matrix: Array<Array<number | null>>
}

function colorFor(v: number | null): string {
  if (v === null || Number.isNaN(v)) return 'rgba(229,231,235,1)' // neutral-200
  // v in [-1,1] -> red (neg) → white (0) → green (pos)
  const pct = (v + 1) / 2 // 0..1
  const red = Math.round(255 * (1 - pct))
  const green = Math.round(255 * pct)
  return `rgba(${red},${green},200,1)`
}

export default function HeatmapMatrix({ columns, matrix }: Props) {
  return (
    <div className="overflow-auto rounded-2xl border bg-white shadow">
      <table className="min-w-[640px] text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 bg-white p-2 text-left"></th>
            {columns.map((c) => (
              <th key={c} className="p-2 text-left">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={i}>
              <th className="sticky left-0 bg-white p-2 text-left">{columns[i]}</th>
              {row.map((v, j) => (
                <td key={`${i}-${j}`} className="p-0">
                  <div
                    title={v === null ? '—' : v.toFixed(3)}
                    style={{
                      background: colorFor(v),
                      width: '100%',
                      height: 28,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#111827',
                      fontSize: 12,
                    }}
                  >
                    {v === null ? '—' : v.toFixed(2)}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* tiny legend */}
      <div className="flex items-center gap-2 p-2 text-xs text-neutral-600">
        <span>−1</span>
        <div className="h-3 flex-1 rounded"
             style={{
               background: 'linear-gradient(90deg, rgba(255,0,0,1) 0%, rgba(255,255,255,1) 50%, rgba(0,255,0,1) 100%)'
             }}/>
        <span>+1</span>
      </div>
    </div>
  )
}
