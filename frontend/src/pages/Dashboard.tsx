// // frontend/src/pages/Dashboard.tsx
// import { useEffect, useMemo, useState } from 'react'
// import { useLocation } from 'react-router-dom'
// import axios from 'axios'
// import FileDropzone from '../components/FileDropzone'
// import InsightCard from '../components/InsightCard'
// import ChartArea, { ChartDatum } from '../components/ChartArea'
// import HeatmapMatrix from '../components/HeatmapMatrix'
// import AnomalyTable from '../components/AnomalyTable'
// import { api } from '../lib/api'

// // NEW: zoom/brush bundle
// import FiltersBar from '../components/FiltersBar'
// import ChartWithBrush from '../components/ChartWithBrush'
// import DataPreviewTable from '../components/DataPreviewTable'

// /* ----------------------------- Types ----------------------------- */

// type Profile = {
//   shape: [number, number]
//   numeric: string[]
//   datetime: string[]
//   categorical: string[]
//   null_pct: Record<string, number>
//   columns: string[]
// }

// type Meta = { numeric: string[]; datetime: string[]; categorical: string[] }

// type SummaryResp = { summary: string }
// type MetaResp = Meta
// type AggregateResp = { data: ChartDatum[]; x: string }
// type TimeseriesResp = { data: ChartDatum[] }
// type ForecastResp = {
//   data?: Array<{ date: string; value: number }>
//   forecast?: Array<{ date: string; value: number }>
// }

// // correlation
// type CorrOk = {
//   columns: string[]
//   matrix: Array<Array<number | null>>
//   method?: 'pearson' | 'spearman' | 'kendall'
// }
// type CorrErr = { error: string }
// type CorrResp = CorrOk | CorrErr

// // narrative
// type NarrativeResp = {
//   insights: string[]
//   method: string
//   used: { target?: string; date_col?: string; group_by?: string | null }
// }

// // anomalies
// type AnomalyRow = { index: number; score: number; reasons: Record<string, number> }
// type AnomalyResp = { method: string; columns: string[]; rows: AnomalyRow[] }

// // existing chart controls
// type Op = 'sum' | 'avg' | 'count'
// type Freq = 'D' | 'W' | 'M'

// // NEW: brush-series agg supports mean/max/min as well
// type BrushAgg = 'sum' | 'mean' | 'count' | 'max' | 'min'

// /* --------------------------- Component --------------------------- */

// export default function Dashboard() {
//   const [workspaceId, setWid] = useState<string | null>(null)
//   const [profile, setProfile] = useState<Profile | null>(null)
//   const [summary, setSummary] = useState<string>('')
//   const [meta, setMeta] = useState<Meta | null>(null)

//   // chart selections (existing)
//   const [chartKind, setChartKind] = useState<'bar' | 'line'>('bar')
//   const [xCol, setXCol] = useState<string>('') // category/date
//   const [yCol, setYCol] = useState<string>('') // numeric
//   const [op, setOp] = useState<Op>('sum')
//   const [freq, setFreq] = useState<Freq>('M')
//   const [limit, setLimit] = useState<number>(25)
//   const [withForecast, setWithForecast] = useState(false)

//   // chart data/ui (existing)
//   const [chartData, setChartData] = useState<ChartDatum[]>([])
//   const [forecastData, setForecastData] = useState<ChartDatum[] | null>(null)
//   const [busy, setBusy] = useState(false)
//   const [chartError, setChartError] = useState<string | null>(null)
//   const [showRaw, setShowRaw] = useState(false)

//   // correlation (existing)
//   const [corrMethod, setCorrMethod] = useState<'pearson' | 'spearman' | 'kendall'>('spearman')
//   const [corrCols, setCorrCols] = useState<string[]>([])
//   const [corrMatrix, setCorrMatrix] = useState<Array<Array<number | null>> | null>(null)
//   const [corrBusy, setCorrBusy] = useState(false)
//   const [corrErr, setCorrErr] = useState<string | null>(null)

//   // narrative (existing)
//   const [target, setTarget] = useState<string>('')
//   const [dateCol, setDateCol] = useState<string>('')
//   const [groupBy, setGroupBy] = useState<string>('') // categorical
//   const [narrativeBusy, setNarrativeBusy] = useState(false)
//   const [narrative, setNarrative] = useState<string[] | null>(null)
//   const [narrativeErr, setNarrativeErr] = useState<string | null>(null)

//   // anomalies (existing)
//   const [anomBusy, setAnomBusy] = useState(false)
//   const [anomMethod, setAnomMethod] = useState<'iforest' | 'zscore'>('iforest')
//   const [anomContamination, setAnomContamination] = useState<number>(0.01)
//   const [anomRows, setAnomRows] = useState<AnomalyRow[]>([])
//   const [anomErr, setAnomErr] = useState<string | null>(null)

//   // NEW: zoom/brush + filters + table state
//   const [filters, setFilters] = useState<Record<string, string[]>>({})
//   const [windowRange, setWindowRange] = useState<{ start?: string; end?: string }>({})
//   const [brushDateCol, setBrushDateCol] = useState<string>('')   // defaulted after meta load
//   const [brushValueCol, setBrushValueCol] = useState<string>('') // defaulted after meta load
//   const [brushFreq, setBrushFreq] = useState<Freq>('M')
//   const [brushAgg, setBrushAgg] = useState<BrushAgg>('sum')

//   /* ---------------------- section anchor scrolling ---------------------- */
//   const { hash } = useLocation()
//   useEffect(() => {
//     if (!hash) return
//     const id = hash.replace('#', '')
//     const el = document.getElementById(id)
//     if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
//   }, [hash])

//   /* ------------------------- After upload ------------------------- */

//   async function afterUpload(res: { workspace_id: string; profile: Profile }): Promise<void> {
//     setWid(res.workspace_id)
//     setProfile(res.profile)

//     const [s, m] = await Promise.all([
//       api.post<SummaryResp>('/insights/summary', { workspace_id: res.workspace_id }),
//       api.post<MetaResp>('/insights/meta', { workspace_id: res.workspace_id }),
//     ])
//     setSummary(s.data.summary)
//     setMeta(m.data)

//     // defaults for charts (existing)
//     if (m.data.datetime.length && m.data.numeric.length) {
//       setChartKind('line')
//       setXCol(m.data.datetime[0])
//       setYCol(m.data.numeric[0])
//       await fetchTimeseries(res.workspace_id, m.data.datetime[0], m.data.numeric[0], op, freq)
//     } else if (m.data.categorical.length) {
//       setChartKind('bar')
//       setXCol(m.data.categorical[0])
//       setYCol(m.data.numeric[0] ?? '')
//       setOp('count')
//       await fetchAggregate(res.workspace_id, m.data.categorical[0], m.data.numeric[0], 'count', limit)
//     } else {
//       setChartData([])
//     }

//     // defaults for other features (existing)
//     if (m.data.numeric.length) setTarget(m.data.numeric[0])
//     if (m.data.datetime.length) setDateCol(m.data.datetime[0])
//     if (m.data.categorical.length) setGroupBy(m.data.categorical[0])

//     // NEW: defaults for zoom/brush bundle
//     if (m.data.datetime.length) setBrushDateCol(m.data.datetime[0])
//     if (m.data.numeric.length) setBrushValueCol(m.data.numeric[0])
//     setWindowRange({})
//     setFilters({})
//   }

//   function resetUpload(): void {
//     setWid(null)
//     setProfile(null)
//     setSummary('')
//     setMeta(null)
//     setChartData([])
//     setForecastData(null)
//     setXCol('')
//     setYCol('')
//     setOp('sum')
//     setChartKind('bar')
//     setShowRaw(false)
//     setChartError(null)
//     setCorrCols([])
//     setCorrMatrix(null)
//     setCorrErr(null)
//     setNarrative(null)
//     setNarrativeErr(null)
//     setAnomRows([])
//     setAnomErr(null)

//     // NEW: reset brush bundle
//     setFilters({})
//     setWindowRange({})
//     setBrushDateCol('')
//     setBrushValueCol('')
//     setBrushFreq('M')
//     setBrushAgg('sum')

//     // jump to upload card
//     const el = document.getElementById('upload')
//     if (el) el.scrollIntoView({ behavior: 'smooth' })
//   }

//   /* --------------------------- Fetchers --------------------------- */

//   async function fetchAggregate(
//     wid: string,
//     x: string,
//     y?: string,
//     agg: Op = 'sum',
//     topN = 25
//   ): Promise<void> {
//     setBusy(true)
//     setChartError(null)
//     setForecastData(null)
//     try {
//       const { data } = await api.post<AggregateResp>('/insights/aggregate', {
//         workspace_id: wid,
//         x,
//         y,
//         op: agg,
//         limit: topN,
//       })
//       setChartData(data.data)
//     } catch (e) {
//       handleAxiosChartErr(e)
//       setChartData([])
//     } finally {
//       setBusy(false)
//     }
//   }

//   async function fetchTimeseries(
//     wid: string,
//     dcol: string,
//     y: string,
//     agg: Op = 'sum',
//     f: Freq = 'M',
//     wantForecast = false
//   ): Promise<void> {
//     setBusy(true)
//     setChartError(null)
//     setForecastData(null)
//     try {
//       const { data } = await api.post<TimeseriesResp>('/insights/timeseries', {
//         workspace_id: wid,
//         date_col: dcol,
//         y,
//         op: agg,
//         freq: f,
//       })
//       setChartData(data.data)

//       if (wantForecast && agg !== 'count') {
//         try {
//           const fc = await api.post<ForecastResp>('/insights/forecast', {
//             workspace_id: wid,
//             date_col: dcol,
//             y,
//             periods: 12,
//             freq: f,
//           })
//           if (Array.isArray(fc.data?.forecast)) {
//             setForecastData(fc.data!.forecast.map(d => ({ date: d.date, forecast: d.value })))
//           }
//         } catch {
//           /* optional */
//         }
//       }
//     } catch (e) {
//       handleAxiosChartErr(e)
//       setChartData([])
//     } finally {
//       setBusy(false)
//     }
//   }

//   function handleAxiosChartErr(e: unknown) {
//     let msg =
//       'Failed to load chart data. If you selected a date field for a line chart, ensure it is date/time-like.'
//     if (axios.isAxiosError(e)) {
//       if (e.response?.status === 400) {
//         msg = 'The server rejected this query (400). Check that your x-axis exists and matches the chart type.'
//       } else if (e.message) {
//         msg = e.message
//       }
//     }
//     setChartError(msg)
//   }

//   /* ---------------------- Reactive refetching ---------------------- */

//   useEffect(() => {
//     if (!workspaceId || !meta) return
//     if (chartKind === 'line' && xCol && yCol) {
//       void fetchTimeseries(workspaceId, xCol, yCol, op, freq, withForecast)
//     } else if (chartKind === 'bar' && xCol) {
//       void fetchAggregate(workspaceId, xCol, yCol || undefined, op, limit)
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [chartKind, xCol, yCol, op, freq, limit, withForecast])

//   /* -------------------------- CSV Export -------------------------- */

//   const canExport = useMemo(() => chartData.length > 0, [chartData])

//   function exportCSV() {
//     if (!chartData.length) return
//     const rows =
//       chartKind === 'line' && forecastData
//         ? mergeByKey(chartData, forecastData, 'date')
//         : chartData
//     downloadCSV(rows, `chart_${chartKind}.csv`)
//   }

//   /* --------------------- Correlation heatmap ---------------------- */

//   async function computeCorr() {
//     if (!workspaceId) return
//     setCorrBusy(true)
//     setCorrErr(null)
//     setCorrCols([])
//     setCorrMatrix(null)
//     try {
//       const resp = await api.post<CorrResp>('/insights/correlation', {
//         workspace_id: workspaceId,
//         method: corrMethod,
//       })
//       if ('error' in resp.data) {
//         setCorrErr(resp.data.error || 'failed to compute correlation')
//         return
//       }
//       const { columns, matrix } = resp.data
//       if (!Array.isArray(columns) || columns.length < 2 || !matrix) {
//         setCorrErr('need at least 2 numeric columns')
//       } else {
//         setCorrCols(columns)
//         setCorrMatrix(matrix)
//       }
//     } catch (e) {
//       setCorrErr(axiosErrMsg(e, 'failed to compute correlation'))
//     } finally {
//       setCorrBusy(false)
//     }
//   }

//   /* -------------------------- Narrative AI ------------------------ */

//   async function generateNarrative() {
//     if (!workspaceId) return
//     setNarrativeBusy(true)
//     setNarrativeErr(null)
//     setNarrative(null)
//     try {
//       const { data } = await api.post<NarrativeResp>('/insights/narrative', {
//         workspace_id: workspaceId,
//         target: target || undefined,
//         date_col: dateCol || undefined,
//         method: corrMethod,
//         group_by: groupBy || undefined,
//       })
//       setNarrative(data.insights)
//     } catch (e) {
//       setNarrativeErr(axiosErrMsg(e, 'failed to generate insights'))
//     } finally {
//       setNarrativeBusy(false)
//     }
//   }

//   /* --------------------------- Anomalies -------------------------- */

//   async function detectAnomalies() {
//     if (!workspaceId) return
//     setAnomBusy(true)
//     setAnomErr(null)
//     setAnomRows([])
//     try {
//       const { data } = await api.post<AnomalyResp>('/insights/anomalies', {
//         workspace_id: workspaceId,
//         method: anomMethod,
//         contamination: anomContamination,
//         max_rows: 50,
//       })
//       setAnomRows(data.rows || [])
//     } catch (e) {
//       setAnomErr(axiosErrMsg(e, 'failed to detect anomalies'))
//     } finally {
//       setAnomBusy(false)
//     }
//   }

//   /* ------------------------------- UI ------------------------------ */

//   return (
//     <div className="grid gap-4">
//       {/* Toolbar */}
//       {workspaceId && (
//         <div className="flex flex-wrap items-center justify-between gap-3">
//           <div className="text-sm text-neutral-600">
//             Workspace:{' '}
//             <span className="font-medium text-neutral-800">{workspaceId}</span>
//           </div>
//           <div className="flex flex-wrap items-center gap-2">
//             <button
//               onClick={() => setShowRaw((s) => !s)}
//               className="px-3 py-1.5 rounded-xl border border-gray-300 bg-white text-black hover:bg-gray-100 shadow-sm"
//               aria-expanded={showRaw}
//             >
//               {showRaw ? 'Hide raw profile' : 'View raw profile'}
//             </button>
//             <button
//               onClick={resetUpload}
//               className="px-3 py-1.5 rounded-xl border border-gray-300 bg-white text-black hover:bg-gray-100 shadow-sm"
//             >
//               Upload another CSV
//             </button>
//           </div>
//         </div>
//       )}

//       {/* Dropzone when no workspace */}
//       <div id="upload">{!workspaceId && <FileDropzone onUploaded={afterUpload} />}</div>

//       {/* Profile cards */}
//       {profile && (
//         <>
//           <div className="grid md:grid-cols-3 gap-4">
//             <InsightCard title="Dataset profile">
//               {`Rows: ${profile.shape[0]}
// Columns: ${profile.shape[1]}
// Numeric: ${profile.numeric.length}
// Datetime: ${profile.datetime.length}
// Categorical: ${profile.categorical.length}`}
//             </InsightCard>

//             <InsightCard title="Null % (first 6)">
//               {Object.entries(profile.null_pct)
//                 .slice(0, 6)
//                 .map(([k, v]) => `${k}: ${v.toFixed(1)}%`)
//                 .join('\n')}
//             </InsightCard>

//             <InsightCard title="Summary">{summary}</InsightCard>
//           </div>

//           {/* ==================== EXISTING CHART AREA ==================== */}
//           {meta && (
//             <div className="rounded-2xl bg-white p-4 shadow border text-neutral-900">
//               <div className="mb-3 font-semibold">Chart</div>
//               <div className="flex flex-wrap gap-3 items-center">
//                 <select
//                   value={chartKind}
//                   onChange={(e) => setChartKind(e.target.value as 'bar' | 'line')}
//                   className="px-3 py-1.5 rounded-xl border"
//                 >
//                   <option value="bar">Bar</option>
//                   <option value="line">Line (time series)</option>
//                 </select>

//                 {chartKind === 'bar' ? (
//                   <>
//                     <select
//                       value={xCol}
//                       onChange={(e) => setXCol(e.target.value)}
//                       className="px-3 py-1.5 rounded-xl border"
//                     >
//                       <option value="" disabled>
//                         Select category
//                       </option>
//                       {meta.categorical.map((c) => (
//                         <option key={c} value={c}>
//                           {c}
//                         </option>
//                       ))}
//                     </select>

//                     <select
//                       value={op}
//                       onChange={(e) => setOp(e.target.value as Op)}
//                       className="px-3 py-1.5 rounded-xl border"
//                     >
//                       <option value="count">count</option>
//                       <option value="sum">sum</option>
//                       <option value="avg">avg</option>
//                     </select>

//                     <select
//                       value={yCol}
//                       onChange={(e) => setYCol(e.target.value)}
//                       className="px-3 py-1.5 rounded-xl border"
//                       disabled={op === 'count'}
//                     >
//                       <option value="">(none)</option>
//                       {meta.numeric.map((c) => (
//                         <option key={c} value={c}>
//                           {c}
//                         </option>
//                       ))}
//                     </select>

//                     <select
//                       value={limit}
//                       onChange={(e) => setLimit(parseInt(e.target.value, 10))}
//                       className="px-3 py-1.5 rounded-xl border"
//                       title="How many bars to show"
//                     >
//                       {[10, 25, 50, 100].map((n) => (
//                         <option key={n} value={n}>
//                           Top {n}
//                         </option>
//                       ))}
//                     </select>
//                   </>
//                 ) : (
//                   <>
//                     <select
//                       value={xCol}
//                       onChange={(e) => setXCol(e.target.value)}
//                       className="px-3 py-1.5 rounded-xl border"
//                     >
//                       {meta.datetime.map((c) => (
//                         <option key={c} value={c}>
//                           {c}
//                         </option>
//                       ))}
//                     </select>

//                     <select
//                       value={yCol}
//                       onChange={(e) => setYCol(e.target.value)}
//                       className="px-3 py-1.5 rounded-xl border"
//                     >
//                       {meta.numeric.map((c) => (
//                         <option key={c} value={c}>
//                           {c}
//                         </option>
//                       ))}
//                     </select>

//                     <select
//                       value={op}
//                       onChange={(e) => setOp(e.target.value as Op)}
//                       className="px-3 py-1.5 rounded-xl border"
//                     >
//                       <option value="sum">sum</option>
//                       <option value="avg">avg</option>
//                       <option value="count">count</option>
//                     </select>

//                     <select
//                       value={freq}
//                       onChange={(e) => setFreq(e.target.value as Freq)}
//                       className="px-3 py-1.5 rounded-xl border"
//                     >
//                       <option value="D">daily</option>
//                       <option value="W">weekly</option>
//                       <option value="M">monthly</option>
//                     </select>

//                     <label className="flex items-center gap-2 text-sm">
//                       <input
//                         type="checkbox"
//                         checked={withForecast}
//                         onChange={(e) => setWithForecast(e.target.checked)}
//                       />
//                       Forecast next 12 periods
//                     </label>
//                   </>
//                 )}
//               </div>
//             </div>
//           )}

//           {(chartData.length > 0 || busy || chartError) && (
//             <ChartArea
//               kind={chartKind}
//               data={
//                 chartKind === 'line' && forecastData
//                   ? mergeByKey(chartData, forecastData, 'date')
//                   : chartData
//               }
//               xKey={chartKind === 'bar' ? xCol || 'x' : 'date'}
//               yKey="value"
//               label={
//                 chartKind === 'bar'
//                   ? `${op} of ${yCol || '(count)'} by ${xCol}`
//                   : `${op} of ${yCol || '(rows)'} over ${xCol} (${freq})`
//               }
//               loading={busy}
//               error={chartError}
//               extraSeries={
//                 chartKind === 'line' && forecastData
//                   ? [{ key: 'forecast', label: 'forecast', type: 'line' as const }]
//                   : []
//               }
//               onExportCSV={canExport ? exportCSV : undefined}
//             />
//           )}

//           {/* ================== NEW: ZOOM/BRUSH BUNDLE ================== */}
//           {meta && workspaceId && (
//             <div id="brush" className="rounded-2xl bg-white p-4 shadow border text-neutral-900">
//               <div className="mb-3 font-semibold">Zoom/Brush + Filters + Data Preview</div>

//               {/* Controls */}
//               <div className="flex flex-wrap items-center gap-3 mb-3">
//                 <select
//                   value={brushDateCol}
//                   onChange={(e) => setBrushDateCol(e.target.value)}
//                   className="px-3 py-1.5 rounded-xl border"
//                   title="Datetime column"
//                 >
//                   {meta.datetime.map((c) => (
//                     <option key={c} value={c}>{c}</option>
//                   ))}
//                 </select>

//                 <select
//                   value={brushValueCol}
//                   onChange={(e) => setBrushValueCol(e.target.value)}
//                   className="px-3 py-1.5 rounded-xl border"
//                   title="Value column"
//                 >
//                   {meta.numeric.map((c) => (
//                     <option key={c} value={c}>{c}</option>
//                   ))}
//                 </select>

//                 <select
//                   value={brushAgg}
//                   onChange={(e) => setBrushAgg(e.target.value as BrushAgg)}
//                   className="px-3 py-1.5 rounded-xl border"
//                   title="Aggregation"
//                 >
//                   <option value="sum">sum</option>
//                   <option value="mean">mean</option>
//                   <option value="count">count</option>
//                   <option value="max">max</option>
//                   <option value="min">min</option>
//                 </select>

//                 <select
//                   value={brushFreq}
//                   onChange={(e) => setBrushFreq(e.target.value as Freq)}
//                   className="px-3 py-1.5 rounded-xl border"
//                   title="Frequency"
//                 >
//                   <option value="D">daily</option>
//                   <option value="W">weekly</option>
//                   <option value="M">monthly</option>
//                 </select>
//               </div>

//               {/* Filters */}
//               <div className="mb-3">
//                 <FiltersBar workspaceId={workspaceId} onChange={setFilters} />
//               </div>

//               {/* Brushable chart */}
//               <ChartWithBrush
//                 workspaceId={workspaceId}
//                 dateCol={brushDateCol || meta.datetime[0]}
//                 valueCol={brushValueCol || meta.numeric[0]}
//                 freq={brushFreq}
//                 agg={brushAgg}
//                 filters={filters}
//                 onWindowChange={setWindowRange}
//               />

//               {/* Data preview table synced to brush+filters */}
//               <DataPreviewTable
//                 workspaceId={workspaceId}
//                 dateCol={brushDateCol || meta.datetime[0]}
//                 window={windowRange}
//                 filters={filters}
//               />
//             </div>
//           )}

//           {/* ===================== Correlation map ====================== */}
//           <div id="correlation" className="rounded-2xl bg-white p-4 shadow border text-neutral-900">
//             <div className="mb-3 flex items-center justify-between">
//               <div className="font-semibold">Correlation map</div>
//               <div className="flex items-center gap-2">
//                 <select
//                   value={corrMethod}
//                   onChange={(e) => setCorrMethod(e.target.value as 'pearson' | 'spearman' | 'kendall')}
//                   className="px-3 py-1.5 rounded-xl border"
//                 >
//                   <option value="pearson">pearson</option>
//                   <option value="spearman">spearman</option>
//                   <option value="kendall">kendall</option>
//                 </select>
//                 <button
//                   onClick={computeCorr}
//                   disabled={!workspaceId || corrBusy}
//                   className="px-3 py-1.5 rounded-xl border"
//                 >
//                   {corrBusy ? 'Computing…' : 'Compute'}
//                 </button>
//               </div>
//             </div>
//             {corrErr && <div className="text-sm text-red-600">{corrErr}</div>}
//             {corrCols.length > 0 && corrMatrix && <HeatmapMatrix columns={corrCols} matrix={corrMatrix} />}
//             {corrCols.length === 0 && !corrBusy && !corrErr && (
//               <div className="text-sm text-neutral-500">
//                 Choose a method and click <strong>Compute</strong> to see numeric column correlations.
//               </div>
//             )}
//           </div>

//           {/* ===================== Insight Narrative ==================== */}
//           {meta && (
//             <div id="narrative" className="rounded-2xl bg-white p-4 shadow border text-neutral-900">
//               <div className="mb-3 font-semibold">AI insight narrative</div>
//               <div className="flex flex-wrap items-center gap-3 mb-3">
//                 <select value={target} onChange={(e) => setTarget(e.target.value)} className="px-3 py-1.5 rounded-xl border">
//                   <option value="">(choose target numeric)</option>
//                   {meta.numeric.map((c) => <option key={c} value={c}>{c}</option>)}
//                 </select>
//                 <select value={dateCol} onChange={(e) => setDateCol(e.target.value)} className="px-3 py-1.5 rounded-xl border">
//                   <option value="">(date column)</option>
//                   {meta.datetime.map((c) => <option key={c} value={c}>{c}</option>)}
//                 </select>
//                 <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className="px-3 py-1.5 rounded-xl border">
//                   <option value="">(group by)</option>
//                   {meta.categorical.map((c) => <option key={c} value={c}>{c}</option>)}
//                 </select>
//                 <button onClick={generateNarrative} disabled={!workspaceId || narrativeBusy} className="px-3 py-1.5 rounded-xl border">
//                   {narrativeBusy ? 'Generating…' : 'Generate'}
//                 </button>
//               </div>
//               {narrativeErr && <div className="text-sm text-red-600">{narrativeErr}</div>}
//               {narrative && (
//                 <ul className="list-disc pl-6 text-sm space-y-1">
//                   {narrative.map((line, i) => <li key={i}>{line}</li>)}
//                 </ul>
//               )}
//               {!narrative && !narrativeBusy && !narrativeErr && (
//                 <div className="text-sm text-neutral-500">Pick a target/date/group and click <strong>Generate</strong>.</div>
//               )}
//             </div>
//           )}

//           {/* ====================== Anomaly detection =================== */}
//           {meta && (
//             <div id="anomalies" className="rounded-2xl bg-white p-4 shadow border text-neutral-900">
//               <div className="mb-3 font-semibold">Anomaly detection</div>
//               <div className="flex flex-wrap items-center gap-3 mb-3">
//                 <select
//                   value={anomMethod}
//                   onChange={(e) => setAnomMethod(e.target.value as 'iforest' | 'zscore')}
//                   className="px-3 py-1.5 rounded-xl border"
//                 >
//                   <option value="iforest">IsolationForest</option>
//                   <option value="zscore">Z-score</option>
//                 </select>
//                 {anomMethod === 'iforest' && (
//                   <input
//                     type="number"
//                     step="0.005"
//                     min={0.001}
//                     max={0.2}
//                     value={anomContamination}
//                     onChange={(e) => setAnomContamination(parseFloat(e.target.value))}
//                     className="px-3 py-1.5 rounded-xl border w-28"
//                     title="Contamination (expected outlier fraction)"
//                   />
//                 )}
//                 <button onClick={detectAnomalies} disabled={!workspaceId || anomBusy} className="px-3 py-1.5 rounded-xl border">
//                   {anomBusy ? 'Scanning…' : 'Detect'}
//                 </button>
//               </div>

//               {anomErr && <div className="text-sm text-red-600">{anomErr}</div>}
//               {anomRows.length > 0 && <AnomalyTable rows={anomRows} />}
//               {anomRows.length === 0 && !anomBusy && !anomErr && (
//                 <div className="text-sm text-neutral-500">Click <strong>Detect</strong> to surface unusual rows.</div>
//               )}
//             </div>
//           )}

//           {/* Raw profile JSON */}
//           {showRaw && profile && (
//             <div className="rounded-2xl bg-white p-4 shadow border text-neutral-900">
//               <div className="flex items-center justify-between mb-2">
//                 <h3 className="font-semibold">Raw profile JSON</h3>
//                 <button
//                   onClick={() => setShowRaw(false)}
//                   className="px-3 py-1.5 rounded-xl border border-gray-300 bg-white text-black hover:bg-gray-100 shadow-sm"
//                 >
//                   Close
//                 </button>
//               </div>
//               <pre className="text-xs max-h-96 overflow-auto">{JSON.stringify(profile, null, 2)}</pre>
//             </div>
//           )}
//         </>
//       )}
//     </div>
//   )
// }

// /* --------------------------- Utilities --------------------------- */

// function downloadCSV(rows: Record<string, unknown>[], filename: string) {
//   if (!rows.length) return
//   const headers = Array.from(
//     rows.reduce<Set<string>>((s, r) => {
//       Object.keys(r).forEach((k) => s.add(k))
//       return s
//     }, new Set())
//   )
//   const csv = [
//     headers.join(','),
//     ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(',')),
//   ].join('\n')
//   const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
//   const url = URL.createObjectURL(blob)
//   const a = document.createElement('a')
//   a.href = url
//   a.download = filename
//   a.click()
//   URL.revokeObjectURL(url)
// }

// function mergeByKey(a: ChartDatum[], b: ChartDatum[], key: string): ChartDatum[] {
//   const map = new Map<string, ChartDatum>()
//   a.forEach((r) => map.set(String(r[key]), { ...r }))
//   b.forEach((r) => {
//     const k = String(r[key])
//     map.set(k, { ...(map.get(k) || {}), ...r })
//   })
//   return Array.from(map.values()).sort((r1, r2) => String(r1[key]).localeCompare(String(r2[key])))
// }

// /** Extract a friendly message from an Axios error without using `any`. */
// function axiosErrMsg(e: unknown, fallback = 'request failed'): string {
//   if (axios.isAxiosError(e)) {
//     const data: unknown = e.response?.data
//     if (data && typeof data === 'object') {
//       const rec = data as Record<string, unknown>
//       if (typeof rec.error === 'string') return rec.error
//       if (typeof rec.message === 'string') return rec.message
//     }
//     return e.message || fallback
//   }
//   return fallback
// }


// frontend/src/pages/Dashboard.tsx
import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import axios from 'axios'
import FileDropzone from '../components/FileDropzone'
import InsightCard from '../components/InsightCard'
import ChartArea, { ChartDatum } from '../components/ChartArea'
import HeatmapMatrix from '../components/HeatmapMatrix'
import AnomalyTable from '../components/AnomalyTable'
import { api } from '../lib/api'

// NEW: zoom/brush bundle
import FiltersBar from '../components/FiltersBar'
import ChartWithBrush from '../components/ChartWithBrush'
import DataPreviewTable from '../components/DataPreviewTable'

/* ----------------------------- Types ----------------------------- */

type Profile = {
  shape: [number, number]
  numeric: string[]
  datetime: string[]
  categorical: string[]
  null_pct: Record<string, number>
  columns: string[]
}

type Meta = { numeric: string[]; datetime: string[]; categorical: string[] }

type SummaryResp = { summary: string }
type MetaResp = Meta
type AggregateResp = { data: ChartDatum[]; x: string }
type TimeseriesResp = { data: ChartDatum[] }
type ForecastResp = {
  data?: Array<{ date: string; value: number }>
  forecast?: Array<{ date: string; value: number }>
}

// correlation
type CorrOk = {
  columns: string[]
  matrix: Array<Array<number | null>>
  method?: 'pearson' | 'spearman' | 'kendall'
}
type CorrErr = { error: string }
type CorrResp = CorrOk | CorrErr

// narrative
type NarrativeResp = {
  insights: string[]
  method: string
  used: { target?: string; date_col?: string; group_by?: string | null }
}

// anomalies
type AnomalyRow = { index: number; score: number; reasons: Record<string, number> }
type AnomalyResp = { method: string; columns: string[]; rows: AnomalyRow[] }

// existing chart controls
type Op = 'sum' | 'avg' | 'count'
type Freq = 'D' | 'W' | 'M'

// NEW: brush-series agg supports mean/max/min as well
type BrushAgg = 'sum' | 'mean' | 'count' | 'max' | 'min'

/* --------------------------- Component --------------------------- */

export default function Dashboard() {
  const [workspaceId, setWid] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [summary, setSummary] = useState<string>('')
  const [meta, setMeta] = useState<Meta | null>(null)

  // chart selections (existing)
  const [chartKind, setChartKind] = useState<'bar' | 'line'>('bar')
  const [xCol, setXCol] = useState<string>('') // category/date
  const [yCol, setYCol] = useState<string>('') // numeric
  const [op, setOp] = useState<Op>('sum')
  const [freq, setFreq] = useState<Freq>('M')
  const [limit, setLimit] = useState<number>(25)
  const [withForecast, setWithForecast] = useState(false)

  // chart data/ui (existing)
  const [chartData, setChartData] = useState<ChartDatum[]>([])
  const [forecastData, setForecastData] = useState<ChartDatum[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [chartError, setChartError] = useState<string | null>(null)
  const [showRaw, setShowRaw] = useState(false)

  // correlation (existing)
  const [corrMethod, setCorrMethod] = useState<'pearson' | 'spearman' | 'kendall'>('spearman')
  const [corrCols, setCorrCols] = useState<string[]>([])
  const [corrMatrix, setCorrMatrix] = useState<Array<Array<number | null>> | null>(null)
  const [corrBusy, setCorrBusy] = useState(false)
  const [corrErr, setCorrErr] = useState<string | null>(null)

  // narrative (existing)
  const [target, setTarget] = useState<string>('')
  const [dateCol, setDateCol] = useState<string>('')
  const [groupBy, setGroupBy] = useState<string>('') // categorical
  const [narrativeBusy, setNarrativeBusy] = useState(false)
  const [narrative, setNarrative] = useState<string[] | null>(null)
  const [narrativeErr, setNarrativeErr] = useState<string | null>(null)

  // anomalies (existing)
  const [anomBusy, setAnomBusy] = useState(false)
  const [anomMethod, setAnomMethod] = useState<'iforest' | 'zscore'>('iforest')
  const [anomContamination, setAnomContamination] = useState<number>(0.01)
  const [anomRows, setAnomRows] = useState<AnomalyRow[]>([])
  const [anomErr, setAnomErr] = useState<string | null>(null)

  // NEW: zoom/brush + filters + table state
  const [filters, setFilters] = useState<Record<string, string[]>>({})
  const [windowRange, setWindowRange] = useState<{ start?: string; end?: string }>({})
  const [brushDateCol, setBrushDateCol] = useState<string>('')   // defaulted after meta load
  const [brushValueCol, setBrushValueCol] = useState<string>('') // defaulted after meta load
  const [brushFreq, setBrushFreq] = useState<Freq>('M')
  const [brushAgg, setBrushAgg] = useState<BrushAgg>('sum')

  /* ---------------------- section anchor scrolling ---------------------- */
  const { hash } = useLocation()
  useEffect(() => {
    if (!hash) return
    const id = hash.replace('#', '')
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hash])

  /* ------------------------- After upload ------------------------- */

  async function afterUpload(res: { workspace_id: string; profile: Profile }): Promise<void> {
    setWid(res.workspace_id)
    setProfile(res.profile)

    const [s, m] = await Promise.all([
      api.post<SummaryResp>('/insights/summary', { workspace_id: res.workspace_id }),
      api.post<MetaResp>('/insights/meta', { workspace_id: res.workspace_id }),
    ])
    setSummary(s.data.summary)
    setMeta(m.data)

    // defaults for charts (existing)
    if (m.data.datetime.length && m.data.numeric.length) {
      setChartKind('line')
      setXCol(m.data.datetime[0])
      setYCol(m.data.numeric[0])
      await fetchTimeseries(res.workspace_id, m.data.datetime[0], m.data.numeric[0], op, freq)
    } else if (m.data.categorical.length) {
      setChartKind('bar')
      setXCol(m.data.categorical[0])
      setYCol(m.data.numeric[0] ?? '')
      setOp('count')
      await fetchAggregate(res.workspace_id, m.data.categorical[0], m.data.numeric[0], 'count', limit)
    } else {
      setChartData([])
    }

    // defaults for other features (existing)
    if (m.data.numeric.length) setTarget(m.data.numeric[0])
    if (m.data.datetime.length) setDateCol(m.data.datetime[0])
    if (m.data.categorical.length) setGroupBy(m.data.categorical[0])

    // NEW: defaults for zoom/brush bundle
    if (m.data.datetime.length) setBrushDateCol(m.data.datetime[0])
    if (m.data.numeric.length) setBrushValueCol(m.data.numeric[0])
    setWindowRange({})
    setFilters({})
  }

  function resetUpload(): void {
    setWid(null)
    setProfile(null)
    setSummary('')
    setMeta(null)
    setChartData([])
    setForecastData(null)
    setXCol('')
    setYCol('')
    setOp('sum')
    setChartKind('bar')
    setShowRaw(false)
    setChartError(null)
    setCorrCols([])
    setCorrMatrix(null)
    setCorrErr(null)
    setNarrative(null)
    setNarrativeErr(null)
    setAnomRows([])
    setAnomErr(null)

    // NEW: reset brush bundle
    setFilters({})
    setWindowRange({})
    setBrushDateCol('')
    setBrushValueCol('')
    setBrushFreq('M')
    setBrushAgg('sum')

    // jump to upload card
    const el = document.getElementById('upload')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  /* --------------------------- Fetchers --------------------------- */

  async function fetchAggregate(
    wid: string,
    x: string,
    y?: string,
    agg: Op = 'sum',
    topN = 25
  ): Promise<void> {
    setBusy(true)
    setChartError(null)
    setForecastData(null)
    try {
      const { data } = await api.post<AggregateResp>('/insights/aggregate', {
        workspace_id: wid,
        x,
        y,
        op: agg,
        limit: topN,
      })
      setChartData(data.data)
    } catch (e) {
      handleAxiosChartErr(e)
      setChartData([])
    } finally {
      setBusy(false)
    }
  }

  async function fetchTimeseries(
    wid: string,
    dcol: string,
    y: string,
    agg: Op = 'sum',
    f: Freq = 'M',
    wantForecast = false
  ): Promise<void> {
    setBusy(true)
    setChartError(null)
    setForecastData(null)
    try {
      const { data } = await api.post<TimeseriesResp>('/insights/timeseries', {
        workspace_id: wid,
        date_col: dcol,
        y,
        op: agg,
        freq: f,
      })
      setChartData(data.data)

      if (wantForecast && agg !== 'count') {
        try {
          const fc = await api.post<ForecastResp>('/insights/forecast', {
            workspace_id: wid,
            date_col: dcol,
            y,
            periods: 12,
            freq: f,
          })
          if (Array.isArray(fc.data?.forecast)) {
            setForecastData(fc.data!.forecast.map(d => ({ date: d.date, forecast: d.value })))
          }
        } catch {
          /* optional */
        }
      }
    } catch (e) {
      handleAxiosChartErr(e)
      setChartData([])
    } finally {
      setBusy(false)
    }
  }

  function handleAxiosChartErr(e: unknown) {
    let msg =
      'Failed to load chart data. If you selected a date field for a line chart, ensure it is date/time-like.'
    if (axios.isAxiosError(e)) {
      if (e.response?.status === 400) {
        msg = 'The server rejected this query (400). Check that your x-axis exists and matches the chart type.'
      } else if (e.message) {
        msg = e.message
      }
    }
    setChartError(msg)
  }

  /* ---------------------- Reactive refetching ---------------------- */

  useEffect(() => {
    if (!workspaceId || !meta) return
    if (chartKind === 'line' && xCol && yCol) {
      void fetchTimeseries(workspaceId, xCol, yCol, op, freq, withForecast)
    } else if (chartKind === 'bar' && xCol) {
      void fetchAggregate(workspaceId, xCol, yCol || undefined, op, limit)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartKind, xCol, yCol, op, freq, limit, withForecast])

  /* -------------------------- CSV Export -------------------------- */

  const canExport = useMemo(() => chartData.length > 0, [chartData])

  function exportCSV() {
    if (!chartData.length) return
    const rows =
      chartKind === 'line' && forecastData
        ? mergeByKey(chartData, forecastData, 'date')
        : chartData
    downloadCSV(rows, `chart_${chartKind}.csv`)
  }

  /* --------------------- Correlation heatmap ---------------------- */

  async function computeCorr() {
    if (!workspaceId) return
    setCorrBusy(true)
    setCorrErr(null)
    setCorrCols([])
    setCorrMatrix(null)
    try {
      const resp = await api.post<CorrResp>('/insights/correlation', {
        workspace_id: workspaceId,
        method: corrMethod,
      })
      if ('error' in resp.data) {
        setCorrErr(resp.data.error || 'failed to compute correlation')
        return
      }
      const { columns, matrix } = resp.data
      if (!Array.isArray(columns) || columns.length < 2 || !matrix) {
        setCorrErr('need at least 2 numeric columns')
      } else {
        setCorrCols(columns)
        setCorrMatrix(matrix)
      }
    } catch (e) {
      setCorrErr(axiosErrMsg(e, 'failed to compute correlation'))
    } finally {
      setCorrBusy(false)
    }
  }

  /* -------------------------- Narrative AI ------------------------ */

  async function generateNarrative() {
    if (!workspaceId) return
    setNarrativeBusy(true)
    setNarrativeErr(null)
    setNarrative(null)
    try {
      const { data } = await api.post<NarrativeResp>('/insights/narrative', {
        workspace_id: workspaceId,
        target: target || undefined,
        date_col: dateCol || undefined,
        method: corrMethod,
        group_by: groupBy || undefined,
      })
      setNarrative(data.insights)
    } catch (e) {
      setNarrativeErr(axiosErrMsg(e, 'failed to generate insights'))
    } finally {
      setNarrativeBusy(false)
    }
  }

  /* --------------------------- Anomalies -------------------------- */

  async function detectAnomalies() {
    if (!workspaceId) return
    setAnomBusy(true)
    setAnomErr(null)
    setAnomRows([])
    try {
      const { data } = await api.post<AnomalyResp>('/insights/anomalies', {
        workspace_id: workspaceId,
        method: anomMethod,
        contamination: anomContamination,
        max_rows: 50,
      })
      setAnomRows(data.rows || [])
    } catch (e) {
      setAnomErr(axiosErrMsg(e, 'failed to detect anomalies'))
    } finally {
      setAnomBusy(false)
    }
  }

  /* ------------------------------- UI ------------------------------ */

  return (
    <div className="grid gap-4">
      {/* Toolbar */}
      {workspaceId && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-neutral-600">
            Workspace:{' '}
            <span className="font-medium text-neutral-800">{workspaceId}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowRaw((s) => !s)}
              className="px-3 py-1.5 rounded-xl border border-gray-300 bg-white text-black hover:bg-gray-100 shadow-sm"
              aria-expanded={showRaw}
            >
              {showRaw ? 'Hide raw profile' : 'View raw profile'}
            </button>
            <button
              onClick={resetUpload}
              className="px-3 py-1.5 rounded-xl border border-gray-300 bg-white text-black hover:bg-gray-100 shadow-sm"
            >
              Upload another CSV
            </button>
          </div>
        </div>
      )}

{/* Dropzone + Getting Started when no workspace */}
{!workspaceId && (
  <section id="upload" className="flex flex-col items-center gap-8">
    <FileDropzone onUploaded={afterUpload} />

    {/* Getting Started panel */}
    <div className="max-w-2xl w-full text-center text-neutral-700 mt-2">
      <h2 className="text-xl font-semibold mb-2">Welcome to QuickInsights Copilot</h2>
      <p className="mb-5">
        Upload a CSV to explore your data with automatic charts, correlations,
        anomalies, and AI summaries.
      </p>

      <div className="grid md:grid-cols-3 gap-4 text-sm text-left">
        <div className="p-4 border rounded-xl bg-white shadow-sm">
          <h3 className="font-medium mb-1">📊 Quick Charts</h3>
          <p>Bar & time-series charts generated from your columns.</p>
        </div>
        <div className="p-4 border rounded-xl bg-white shadow-sm">
          <h3 className="font-medium mb-1">🤖 AI Narrative</h3>
          <p>Plain-language highlights and trends in your dataset.</p>
        </div>
        <div className="p-4 border rounded-xl bg-white shadow-sm">
          <h3 className="font-medium mb-1">🔎 Anomaly Detection</h3>
          <p>Surface unusual rows and patterns automatically.</p>
        </div>
      </div>
    </div>

    {/* New Footer Section */}
    <footer className="mt-16 w-full text-center text-sm text-neutral-500 border-t pt-6">
      <p className="mb-2">
        💡 Tip: Try uploading a dataset with <span className="font-medium">dates</span> and <span className="font-medium">numbers</span> 
        to unlock forecasting and anomaly detection.
      </p>
      <p className="mb-1">Need help? Visit the <a href="/help" className="underline">Help page</a>.</p>
      <p className="text-xs">QuickInsights Copilot • v1.0.0</p>
    </footer>
  </section>
)}


      {/* Profile cards */}
      {profile && (
        <>
          <div className="grid md:grid-cols-3 gap-4">
            <InsightCard title="Dataset profile">
              {`Rows: ${profile.shape[0]}
Columns: ${profile.shape[1]}
Numeric: ${profile.numeric.length}
Datetime: ${profile.datetime.length}
Categorical: ${profile.categorical.length}`}
            </InsightCard>

            <InsightCard title="Null % (first 6)">
              {Object.entries(profile.null_pct)
                .slice(0, 6)
                .map(([k, v]) => `${k}: ${v.toFixed(1)}%`)
                .join('\n')}
            </InsightCard>

            <InsightCard title="Summary">{summary}</InsightCard>
          </div>

          {/* ==================== EXISTING CHART AREA ==================== */}
          {meta && (
            <div className="rounded-2xl bg-white p-4 shadow border text-neutral-900">
              <div className="mb-3 font-semibold">Chart</div>
              <div className="flex flex-wrap gap-3 items-center">
                <select
                  value={chartKind}
                  onChange={(e) => setChartKind(e.target.value as 'bar' | 'line')}
                  className="px-3 py-1.5 rounded-xl border"
                >
                  <option value="bar">Bar</option>
                  <option value="line">Line (time series)</option>
                </select>

                {chartKind === 'bar' ? (
                  <>
                    <select
                      value={xCol}
                      onChange={(e) => setXCol(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border"
                    >
                      <option value="" disabled>
                        Select category
                      </option>
                      {meta.categorical.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>

                    <select
                      value={op}
                      onChange={(e) => setOp(e.target.value as Op)}
                      className="px-3 py-1.5 rounded-xl border"
                    >
                      <option value="count">count</option>
                      <option value="sum">sum</option>
                      <option value="avg">avg</option>
                    </select>

                    <select
                      value={yCol}
                      onChange={(e) => setYCol(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border"
                      disabled={op === 'count'}
                    >
                      <option value="">(none)</option>
                      {meta.numeric.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>

                    <select
                      value={limit}
                      onChange={(e) => setLimit(parseInt(e.target.value, 10))}
                      className="px-3 py-1.5 rounded-xl border"
                      title="How many bars to show"
                    >
                      {[10, 25, 50, 100].map((n) => (
                        <option key={n} value={n}>
                          Top {n}
                        </option>
                      ))}
                    </select>
                  </>
                ) : (
                  <>
                    <select
                      value={xCol}
                      onChange={(e) => setXCol(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border"
                    >
                      {meta.datetime.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>

                    <select
                      value={yCol}
                      onChange={(e) => setYCol(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border"
                    >
                      {meta.numeric.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>

                    <select
                      value={op}
                      onChange={(e) => setOp(e.target.value as Op)}
                      className="px-3 py-1.5 rounded-xl border"
                    >
                      <option value="sum">sum</option>
                      <option value="avg">avg</option>
                      <option value="count">count</option>
                    </select>

                    <select
                      value={freq}
                      onChange={(e) => setFreq(e.target.value as Freq)}
                      className="px-3 py-1.5 rounded-xl border"
                    >
                      <option value="D">daily</option>
                      <option value="W">weekly</option>
                      <option value="M">monthly</option>
                    </select>

                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={withForecast}
                        onChange={(e) => setWithForecast(e.target.checked)}
                      />
                      Forecast next 12 periods
                    </label>
                  </>
                )}
              </div>
            </div>
          )}

          {(chartData.length > 0 || busy || chartError) && (
            <ChartArea
              kind={chartKind}
              data={
                chartKind === 'line' && forecastData
                  ? mergeByKey(chartData, forecastData, 'date')
                  : chartData
              }
              xKey={chartKind === 'bar' ? xCol || 'x' : 'date'}
              yKey="value"
              label={
                chartKind === 'bar'
                  ? `${op} of ${yCol || '(count)'} by ${xCol}`
                  : `${op} of ${yCol || '(rows)'} over ${xCol} (${freq})`
              }
              loading={busy}
              error={chartError}
              extraSeries={
                chartKind === 'line' && forecastData
                  ? [{ key: 'forecast', label: 'forecast', type: 'line' as const }]
                  : []
              }
              onExportCSV={canExport ? exportCSV : undefined}
            />
          )}

          {/* ================== NEW: ZOOM/BRUSH BUNDLE ================== */}
          {meta && workspaceId && (
            <div id="brush" className="rounded-2xl bg-white p-4 shadow border text-neutral-900">
              <div className="mb-3 font-semibold">Zoom/Brush + Filters + Data Preview</div>

              {/* Controls */}
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <select
                  value={brushDateCol}
                  onChange={(e) => setBrushDateCol(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border"
                  title="Datetime column"
                >
                  {meta.datetime.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <select
                  value={brushValueCol}
                  onChange={(e) => setBrushValueCol(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border"
                  title="Value column"
                >
                  {meta.numeric.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <select
                  value={brushAgg}
                  onChange={(e) => setBrushAgg(e.target.value as BrushAgg)}
                  className="px-3 py-1.5 rounded-xl border"
                  title="Aggregation"
                >
                  <option value="sum">sum</option>
                  <option value="mean">mean</option>
                  <option value="count">count</option>
                  <option value="max">max</option>
                  <option value="min">min</option>
                </select>

                <select
                  value={brushFreq}
                  onChange={(e) => setBrushFreq(e.target.value as Freq)}
                  className="px-3 py-1.5 rounded-xl border"
                  title="Frequency"
                >
                  <option value="D">daily</option>
                  <option value="W">weekly</option>
                  <option value="M">monthly</option>
                </select>
              </div>

              {/* Filters */}
              <div className="mb-3">
                <FiltersBar workspaceId={workspaceId} onChange={setFilters} />
              </div>

              {/* Brushable chart */}
              <ChartWithBrush
                workspaceId={workspaceId}
                dateCol={brushDateCol || meta.datetime[0]}
                valueCol={brushValueCol || meta.numeric[0]}
                freq={brushFreq}
                agg={brushAgg}
                filters={filters}
                onWindowChange={setWindowRange}
              />

              {/* Data preview table synced to brush+filters */}
              <DataPreviewTable
                workspaceId={workspaceId}
                dateCol={brushDateCol || meta.datetime[0]}
                window={windowRange}
                filters={filters}
              />
            </div>
          )}

          {/* ===================== Correlation map ====================== */}
          <div id="correlation" className="rounded-2xl bg-white p-4 shadow border text-neutral-900">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-semibold">Correlation map</div>
              <div className="flex items-center gap-2">
                <select
                  value={corrMethod}
                  onChange={(e) => setCorrMethod(e.target.value as 'pearson' | 'spearman' | 'kendall')}
                  className="px-3 py-1.5 rounded-xl border"
                >
                  <option value="pearson">pearson</option>
                  <option value="spearman">spearman</option>
                  <option value="kendall">kendall</option>
                </select>
                <button
                  onClick={computeCorr}
                  disabled={!workspaceId || corrBusy}
                  className="px-3 py-1.5 rounded-xl border"
                >
                  {corrBusy ? 'Computing…' : 'Compute'}
                </button>
              </div>
            </div>
            {corrErr && <div className="text-sm text-red-600">{corrErr}</div>}
            {corrCols.length > 0 && corrMatrix && <HeatmapMatrix columns={corrCols} matrix={corrMatrix} />}
            {corrCols.length === 0 && !corrBusy && !corrErr && (
              <div className="text-sm text-neutral-500">
                Choose a method and click <strong>Compute</strong> to see numeric column correlations.
              </div>
            )}
          </div>

          {/* ===================== Insight Narrative ==================== */}
          {meta && (
            <div id="narrative" className="rounded-2xl bg-white p-4 shadow border text-neutral-900">
              <div className="mb-3 font-semibold">AI insight narrative</div>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <select value={target} onChange={(e) => setTarget(e.target.value)} className="px-3 py-1.5 rounded-xl border">
                  <option value="">(choose target numeric)</option>
                  {meta.numeric.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={dateCol} onChange={(e) => setDateCol(e.target.value)} className="px-3 py-1.5 rounded-xl border">
                  <option value="">(date column)</option>
                  {meta.datetime.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className="px-3 py-1.5 rounded-xl border">
                  <option value="">(group by)</option>
                  {meta.categorical.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={generateNarrative} disabled={!workspaceId || narrativeBusy} className="px-3 py-1.5 rounded-xl border">
                  {narrativeBusy ? 'Generating…' : 'Generate'}
                </button>
              </div>
              {narrativeErr && <div className="text-sm text-red-600">{narrativeErr}</div>}
              {narrative && (
                <ul className="list-disc pl-6 text-sm space-y-1">
                  {narrative.map((line, i) => <li key={i}>{line}</li>)}
                </ul>
              )}
              {!narrative && !narrativeBusy && !narrativeErr && (
                <div className="text-sm text-neutral-500">Pick a target/date/group and click <strong>Generate</strong>.</div>
              )}
            </div>
          )}

          {/* ====================== Anomaly detection =================== */}
          {meta && (
            <div id="anomalies" className="rounded-2xl bg-white p-4 shadow border text-neutral-900">
              <div className="mb-3 font-semibold">Anomaly detection</div>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <select
                  value={anomMethod}
                  onChange={(e) => setAnomMethod(e.target.value as 'iforest' | 'zscore')}
                  className="px-3 py-1.5 rounded-xl border"
                >
                  <option value="iforest">IsolationForest</option>
                  <option value="zscore">Z-score</option>
                </select>
                {anomMethod === 'iforest' && (
                  <input
                    type="number"
                    step="0.005"
                    min={0.001}
                    max={0.2}
                    value={anomContamination}
                    onChange={(e) => setAnomContamination(parseFloat(e.target.value))}
                    className="px-3 py-1.5 rounded-xl border w-28"
                    title="Contamination (expected outlier fraction)"
                  />
                )}
                <button onClick={detectAnomalies} disabled={!workspaceId || anomBusy} className="px-3 py-1.5 rounded-xl border">
                  {anomBusy ? 'Scanning…' : 'Detect'}
                </button>
              </div>

              {anomErr && <div className="text-sm text-red-600">{anomErr}</div>}
              {anomRows.length > 0 && <AnomalyTable rows={anomRows} />}
              {anomRows.length === 0 && !anomBusy && !anomErr && (
                <div className="text-sm text-neutral-500">Click <strong>Detect</strong> to surface unusual rows.</div>
              )}
            </div>
          )}

          {/* Raw profile JSON */}
          {showRaw && profile && (
            <div className="rounded-2xl bg-white p-4 shadow border text-neutral-900">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Raw profile JSON</h3>
                <button
                  onClick={() => setShowRaw(false)}
                  className="px-3 py-1.5 rounded-xl border border-gray-300 bg-white text-black hover:bg-gray-100 shadow-sm"
                >
                  Close
                </button>
              </div>
              <pre className="text-xs max-h-96 overflow-auto">{JSON.stringify(profile, null, 2)}</pre>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* --------------------------- Utilities --------------------------- */

function downloadCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return
  const headers = Array.from(
    rows.reduce<Set<string>>((s, r) => {
      Object.keys(r).forEach((k) => s.add(k))
      return s
    }, new Set())
  )
  const csv = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(',')),
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function mergeByKey(a: ChartDatum[], b: ChartDatum[], key: string): ChartDatum[] {
  const map = new Map<string, ChartDatum>()
  a.forEach((r) => map.set(String(r[key]), { ...r }))
  b.forEach((r) => {
    const k = String(r[key])
    map.set(k, { ...(map.get(k) || {}), ...r })
  })
  return Array.from(map.values()).sort((r1, r2) => String(r1[key]).localeCompare(String(r2[key])))
}

/** Extract a friendly message from an Axios error without using `any`. */
function axiosErrMsg(e: unknown, fallback = 'request failed'): string {
  if (axios.isAxiosError(e)) {
    const data: unknown = e.response?.data
    if (data && typeof data === 'object') {
      const rec = data as Record<string, unknown>
      if (typeof rec.error === 'string') return rec.error
      if (typeof rec.message === 'string') return rec.message
    }
    return e.message || fallback
  }
  return fallback
}
