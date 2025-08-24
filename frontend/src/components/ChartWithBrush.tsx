// frontend/src/components/ChartWithBrush.tsx
import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Brush,
  ResponsiveContainer,
} from "recharts";
import dayjs from "dayjs";
import { api } from "../lib/api";

/* ----------------------------- Types ----------------------------- */

type Point = { t: string; y: number | null };

type Props = {
  workspaceId: string;
  /** Backend datetime column */
  dateCol?: string;
  /** Backend numeric column */
  valueCol?: string;
  /** Resample frequency */
  freq?: "D" | "W" | "M" | "Q" | "Y";
  /** Aggregation */
  agg?: "sum" | "mean" | "count" | "max" | "min";
  /** Column -> selected values */
  filters: Record<string, string[]>;
  /** Emits ISO strings for the brushed window */
  onWindowChange?: (w: { start?: string; end?: string }) => void;
};

type BrushRange = { startIndex?: number; endIndex?: number } | undefined;

/* --------------------------- Component --------------------------- */

export default function ChartWithBrush({
  workspaceId,
  dateCol = "Year",
  valueCol = "Value",
  freq = "M",
  agg = "sum",
  filters,
  onWindowChange,
}: Props) {
  const [points, setPoints] = useState<Point[]>([]);
  const [window, setWindow] = useState<{ start?: string; end?: string }>({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Body sent to /api/:wid/series
  const body = useMemo(
    () => ({
      date_col: dateCol,
      value_col: valueCol,
      freq,
      agg,
      start: window.start,
      end: window.end,
      // backend expects comma-joined strings per column
      filters: Object.fromEntries(
        Object.entries(filters).map(([k, v]) => [k, (v ?? []).join(",")]),
      ),
    }),
    [dateCol, valueCol, freq, agg, window, filters],
  );

  useEffect(() => {
    if (!workspaceId) {
      setPoints([]);
      return;
    }

    const ctrl = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const { data } = await api.post<{ points?: Point[] }>(
          `/api/${workspaceId}/series`,
          body,
          { signal: ctrl.signal },
        );

        setPoints(Array.isArray(data?.points) ? data.points : []);
      } catch (e) {
        // Ignore cancellations; surface everything else
        const name = (e as { name?: string })?.name;
        if (name === "CanceledError" || name === "AbortError") return;
        setErr("Failed to fetch series.");
        setPoints([]);
      } finally {
        setLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, [workspaceId, body]);

  // Convert to Recharts-friendly array with a stable x index
  const data = useMemo(
    () => points.map((p, i) => ({ i, y: p.y, t: p.t })),
    [points],
  );

  const tickFormatter = (i: number): string => {
    const iso = data[i]?.t;
    if (!iso) return "";
    // Simple formatter: month for M, otherwise year
    return dayjs(iso).format(freq === "M" ? "YYYY-MM" : "YYYY");
  };

  const tooltipLabel = (i: number | string): string => {
    const idx = typeof i === "string" ? Number(i) : i;
    const iso = data[idx]?.t;
    return iso ? dayjs(iso).format("YYYY-MM-DD") : "";
  };

  const handleBrush = (range: BrushRange) => {
    const startIdx = range?.startIndex ?? 0;
    const endIdx = Math.min(range?.endIndex ?? data.length - 1, data.length - 1);

    const start = data[startIdx]?.t;
    const end = data[endIdx]?.t;

    const w = { start, end };
    setWindow(w);
    onWindowChange?.(w);
  };

  return (
    <div className="w-full h-80">
      {err && <div className="text-sm text-red-600 mb-2">{err}</div>}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="i" tickFormatter={tickFormatter} />
          <YAxis />
          <Tooltip labelFormatter={tooltipLabel} />
          <Line
            type="monotone"
            dataKey="y"
            dot={false}
            isAnimationActive={!loading}
            connectNulls
          />
          <Brush
            dataKey="i"
            height={24}
            travellerWidth={8}
            onChange={handleBrush}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
