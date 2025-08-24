// import React, { useMemo, useRef } from 'react'
// import {
//   ResponsiveContainer,
//   BarChart,
//   Bar,
//   LineChart,
//   Line,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   Legend,
// } from 'recharts'

// export type ChartDatum = Record<string, string | number>

// type ExtraSeries = {

//   key: string
//   /** legend label (defaults to key) */
//   label?: string
//   /** how to render this series (defaults to 'line' on line charts, 'bar' on bar charts) */
//   type?: 'line' | 'bar'
// }

// type Props = {
//   kind: 'bar' | 'line'
//   data: ChartDatum[]
//   /** x-axis key (for bar: category; for line: typically 'date') */
//   xKey: string
//   /** y-axis numeric key (we use 'value' from the API) */
//   yKey: string
//   /** title above the chart */
//   label?: string

//   /** UI states */
//   loading?: boolean
//   error?: string | null

//   /** Optional additional series (e.g., forecast) */
//   extraSeries?: ExtraSeries[]

//   /** Show an Export CSV button and call this when clicked */
//   onExportCSV?: () => void

//   /** Show an Export PNG button; we call this with the chart node */
//   onExportPNG?: (node: HTMLElement) => void
// }

// const EmptyMessage: React.FC<{ text: string }> = ({ text }) => (
//   <div className="flex h-[260px] items-center justify-center text-sm text-neutral-500">
//     {text}
//   </div>
// )

// /** Format numbers nicely on axes & tooltips: 1200 -> 1.2k, 3_400_000 -> 3.4M */
// function formatSI(value: number | string): string {
//   const n = typeof value === 'string' ? Number(value) : value
//   if (!isFinite(n)) return String(value)
//   const abs = Math.abs(n)
//   if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`
//   if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
//   if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}k`
//   // show a couple decimals for small non-integers
//   return Math.abs(n) < 1 && n !== 0 ? n.toFixed(2) : String(n)
// }

// export default function ChartArea({
//   kind,
//   data,
//   xKey,
//   yKey,
//   label,
//   loading,
//   error,
//   extraSeries = [],
//   onExportCSV,
//   onExportPNG,
// }: Props) {
//   const rows = data?.length ?? 0
//   const chartRef = useRef<HTMLDivElement>(null)

//   const hasExtras = useMemo(() => extraSeries.length > 0, [extraSeries])

//   // Shared axis & tooltip helpers
//   const yAxis = (
//     <YAxis
//       width={84}                 // <- extra room so labels don’t get cut off
//       allowDecimals
//       tickFormatter={formatSI}
//       domain={['auto', 'auto']} // let Recharts pick a reasonable range
//     />
//   )

//   const toolTip = (
//     <Tooltip
//     formatter={(val: number | string | (number | string)[], name: string) => {
//       const n = typeof val === 'number' ? val : Number(val)
//       return [formatSI(n), name]
//     }}
//   />
  
//   )

//   return (
//     <div className="rounded-2xl bg-white p-4 shadow border text-neutral-900">
//       {/* Header */}
//       <div className="mb-2 flex items-center justify-between">
//         <div className="font-semibold">{label || 'Chart'}</div>

//         <div className="flex items-center gap-2">
//           {onExportCSV && (
//             <button
//               onClick={onExportCSV}
//               disabled={!rows}
//               className="px-2 py-1 rounded-lg border text-sm disabled:opacity-50"
//               title={rows ? 'Export current chart to CSV' : 'No data to export'}
//             >
//               Export CSV
//             </button>
//           )}
//           {onExportPNG && (
//             <button
//               onClick={() => {
//                 if (chartRef.current) onExportPNG(chartRef.current)
//               }}
//               disabled={!rows}
//               className="px-2 py-1 rounded-lg border text-sm disabled:opacity-50"
//               title={rows ? 'Export current chart to PNG' : 'No chart to export'}
//             >
//               Export PNG
//             </button>
//           )}
//         </div>
//       </div>

//       {/* Body */}
//       {error ? (
//         <EmptyMessage text={error} />
//       ) : loading ? (
//         <EmptyMessage text="Loading chart…" />
//       ) : rows === 0 ? (
//         <EmptyMessage text="No data returned for this selection." />
//       ) : (
//         <div ref={chartRef} style={{ width: '100%', height: 340 }}>
//           <ResponsiveContainer>
//             {kind === 'bar' ? (
//               <BarChart
//                 data={data}
//                 margin={{ top: 8, right: 16, bottom: 8, left: 12 }} // overall breathing room
//               >
//                 <CartesianGrid strokeDasharray="3 3" />
//                 <XAxis dataKey={xKey} tickMargin={8} />
//                 {yAxis}
//                 {toolTip}
//                 <Legend />
//                 {/* Base series */}
//                 <Bar dataKey={yKey} name={label || 'value'} />
//                 {/* Extra series — allow both bar & line overlays */}
//                 {hasExtras &&
//                   extraSeries.map((s) =>
//                     (s.type ?? 'bar') === 'bar' ? (
//                       <Bar key={s.key} dataKey={s.key} name={s.label || s.key} />
//                     ) : (
//                       <Line
//                         key={s.key}
//                         type="monotone"
//                         dataKey={s.key}
//                         name={s.label || s.key}
//                         dot={false}
//                         strokeDasharray="4 4"
//                       />
//                     )
//                   )}
//               </BarChart>
//             ) : (
//               <LineChart
//                 data={data}
//                 margin={{ top: 8, right: 16, bottom: 8, left: 12 }}
//               >
//                 <CartesianGrid strokeDasharray="3 3" />
//                 <XAxis dataKey={xKey} tickMargin={8} />
//                 {yAxis}
//                 {toolTip}
//                 <Legend />
//                 {/* Base series */}
//                 <Line type="monotone" dataKey={yKey} name={label || 'value'} dot={false} />
//                 {/* Extra series */}
//                 {hasExtras &&
//                   extraSeries.map((s) =>
//                     (s.type ?? 'line') === 'line' ? (
//                       <Line
//                         key={s.key}
//                         type="monotone"
//                         dataKey={s.key}
//                         name={s.label || s.key}
//                         dot={false}
//                         strokeDasharray="4 4"
//                       />
//                     ) : (
//                       <Bar key={s.key} dataKey={s.key} name={s.label || s.key} />
//                     )
//                   )}
//               </LineChart>
//             )}
//           </ResponsiveContainer>
//         </div>
//       )}
//     </div>
//   )
// }

// frontend/src/components/ChartArea.tsx
import React, { useMemo, useRef } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Brush,
} from 'recharts'

export type ChartDatum = Record<string, string | number>

type ExtraSeries = {
  key: string
  label?: string
  type?: 'line' | 'bar'
}

type Props = {
  kind: 'bar' | 'line'
  data: ChartDatum[]
  xKey: string
  yKey: string
  label?: string
  loading?: boolean
  error?: string | null
  extraSeries?: ExtraSeries[]
  onExportCSV?: () => void
  onExportPNG?: (node: HTMLElement) => void
}

const EmptyMessage: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex h-[260px] items-center justify-center text-sm text-neutral-500">{text}</div>
)

// SI formatter for big numbers
function formatSI(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1e12) return (n / 1e12).toFixed(2).replace(/\.00$/, '') + 'T'
  if (abs >= 1e9) return (n / 1e9).toFixed(2).replace(/\.00$/, '') + 'B'
  if (abs >= 1e6) return (n / 1e6).toFixed(2).replace(/\.00$/, '') + 'M'
  if (abs >= 1e3) return (n / 1e3).toFixed(2).replace(/\.00$/, '') + 'K'
  return String(n)
}

export default function ChartArea({
  kind,
  data,
  xKey,
  yKey,
  label,
  loading,
  error,
  extraSeries = [],
  onExportCSV,
  onExportPNG,
}: Props) {
  const rows = data?.length ?? 0
  const chartRef = useRef<HTMLDivElement>(null)
  const hasExtras = useMemo(() => extraSeries.length > 0, [extraSeries])

  // Custom tooltip with SI formatting
  const toolTip = (
    <Tooltip
      formatter={(val: unknown, name: string) => {
        const n = typeof val === 'number' ? val : Number(val)
        return [formatSI(n), name]
      }}
    />
  )

  const yAxis = <YAxis tickFormatter={(v) => formatSI(Number(v))} width={64} />

  return (
    <div className="rounded-2xl bg-white p-4 shadow border text-neutral-900">
      <div className="mb-2 flex items-center justify-between">
        <div className="font-semibold">{label || 'Chart'}</div>
        <div className="flex items-center gap-2">
          {onExportCSV && (
            <button onClick={onExportCSV} disabled={!rows} className="px-2 py-1 rounded-lg border text-sm disabled:opacity-50">
              Export CSV
            </button>
          )}
          {onExportPNG && (
            <button
              onClick={() => chartRef.current && onExportPNG(chartRef.current)}
              disabled={!rows}
              className="px-2 py-1 rounded-lg border text-sm disabled:opacity-50"
            >
              Export PNG
            </button>
          )}
        </div>
      </div>

      {error ? (
        <EmptyMessage text={error} />
      ) : loading ? (
        <EmptyMessage text="Loading chart…" />
      ) : rows === 0 ? (
        <EmptyMessage text="No data returned for this selection." />
      ) : (
        <div ref={chartRef} style={{ width: '100%', height: 360 }}>
          <ResponsiveContainer>
            {kind === 'bar' ? (
              <BarChart data={data} margin={{ top: 10, right: 10, left: 12, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={xKey} />
                {yAxis}
                {toolTip}
                <Legend />
                <Bar dataKey={yKey} name={label || 'value'} />
                {hasExtras &&
                  extraSeries.map((s) =>
                    (s.type ?? 'bar') === 'bar' ? (
                      <Bar key={s.key} dataKey={s.key} name={s.label || s.key} />
                    ) : (
                      <Line key={s.key} type="monotone" dataKey={s.key} name={s.label || s.key} dot={false} strokeDasharray="4 4" />
                    ),
                  )}
                <Brush dataKey={xKey} height={24} travellerWidth={8} />
              </BarChart>
            ) : (
              <LineChart data={data} margin={{ top: 10, right: 10, left: 12, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={xKey} />
                {yAxis}
                {toolTip}
                <Legend />
                <Line type="monotone" dataKey={yKey} name={label || 'value'} dot={false} />
                {hasExtras &&
                  extraSeries.map((s) =>
                    (s.type ?? 'line') === 'line' ? (
                      <Line key={s.key} type="monotone" dataKey={s.key} name={s.label || s.key} dot={false} strokeDasharray="4 4" />
                    ) : (
                      <Bar key={s.key} dataKey={s.key} name={s.label || s.key} />
                    ),
                  )}
                <Brush dataKey={xKey} height={24} travellerWidth={8} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
