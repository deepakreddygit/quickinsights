// // frontend/src/components/AnomalyTable.tsx
// import React from 'react'

type Row = {
  index: number
  score: number
  reasons: Record<string, number>
}

type Props = {
  rows: Row[]
}

/**
 * A clean, fully-bordered, scrollable table for anomaly results.
 * No external UI libs; Tailwind only.
 */
export default function AnomalyTable({ rows }: Props) {
  return (
    <div className="overflow-auto rounded-2xl border border-gray-300 shadow-sm">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-neutral-50 text-neutral-700">
            <th className="sticky top-0 z-10 text-left px-3 py-2 border-b border-gray-300">Index</th>
            <th className="sticky top-0 z-10 text-left px-3 py-2 border-b border-gray-300">Score</th>
            <th className="sticky top-0 z-10 text-left px-3 py-2 border-b border-gray-300">
              Top contributing columns (z)
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.index}-${i}`} className="odd:bg-white even:bg-neutral-50">
              <td className="px-3 py-2 border-t border-gray-200 font-mono">{r.index}</td>
              <td className="px-3 py-2 border-t border-gray-200 font-mono">{r.score.toFixed(3)}</td>
              <td className="px-3 py-2 border-t border-gray-200">
                <div className="flex flex-wrap gap-1">
                  {Object.entries(r.reasons)
                    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
                    .slice(0, 6)
                    .map(([k, v]) => (
                      <span
                        key={k}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-gray-300 bg-white"
                        title={`${k}: ${v.toFixed(2)}`}
                      >
                        <span className="font-medium">{k}</span>
                        <span className="text-neutral-500">({v.toFixed(2)})</span>
                      </span>
                    ))}
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td className="px-3 py-4 text-neutral-500" colSpan={3}>
                No anomalies to display.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
