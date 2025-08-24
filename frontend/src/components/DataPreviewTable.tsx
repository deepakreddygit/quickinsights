// frontend/src/components/DataPreviewTable.tsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

/* ----------------------------- Types ----------------------------- */

type RowsResp = {
  total: number;
  page: number;
  page_size: number;
  columns: string[];
  rows: Record<string, unknown>[];
};

/* --------------------------- Component --------------------------- */

export default function DataPreviewTable({
  workspaceId,
  dateCol,
  window,
  filters,
}: {
  workspaceId: string;
  dateCol?: string;
  window: { start?: string; end?: string };
  filters: Record<string, string[]>;
}) {
  const [page, setPage] = useState(1);
  const [resp, setResp] = useState<RowsResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Stable key for dependency arrays without tripping exhaustive-deps
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);

  // Build request body
  const body = useMemo(
    () => ({
      date_col: dateCol,
      start: window.start,
      end: window.end,
      filters: Object.fromEntries(
        Object.entries(filters).map(([k, v]) => [k, (v ?? []).join(",")]),
      ),
      page,
      page_size: 50,
    }),
    [dateCol, window.start, window.end, filtersKey, page],
  );

  // Reset to first page when the slice window / filters / date column changes
  useEffect(() => {
    setPage(1);
  }, [filtersKey, window.start, window.end, dateCol]);

  // Fetch rows
  useEffect(() => {
    if (!workspaceId) {
      setResp(null);
      setErr("Missing workspace id.");
      return;
    }

    const ctrl = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const { data } = await api.post<RowsResp>(
          `/api/${workspaceId}/rows`,
          body,
          { signal: ctrl.signal },
        );

        setResp(data);
      } catch (e) {
        // Abort is fine; otherwise show a simple message
        const name = (e as { name?: string })?.name;
        if (name === "CanceledError" || name === "AbortError") return;

        // Attempt to surface a friendlier message if available
        const msg =
          (e as { message?: string })?.message?.includes("403")
            ? "Forbidden (403). Is your token set?"
            : "Network Error";
        setErr(msg);
        setResp(null);
      } finally {
        setLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, [workspaceId, body]);

  const pageCount = useMemo(
    () => (resp ? Math.max(1, Math.ceil(resp.total / resp.page_size)) : 1),
    [resp],
  );

  /* ------------------------------- UI ------------------------------- */

  return (
    <div className="text-sm">
      {err && <div className="text-red-600 mb-2">{err}</div>}
      {!resp && !err && loading && <div className="text-neutral-500">Loading…</div>}

      {resp && (
        <div className="overflow-auto border rounded-xl">
          <table className="min-w-full text-xs">
            <thead>
              <tr>
                {resp.columns.map((c) => (
                  <th key={c} className="px-2 py-1 text-left border-b bg-gray-50">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resp.rows.length === 0 && (
                <tr>
                  <td className="px-2 py-3 text-neutral-500" colSpan={resp.columns.length || 1}>
                    No rows.
                  </td>
                </tr>
              )}
              {resp.rows.map((r, i) => (
                <tr key={i} className="odd:bg-white even:bg-gray-50">
                  {resp.columns.map((c) => (
                    <td key={`${i}-${c}`} className="px-2 py-1 border-b">
                      {String(r[c] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pager */}
          <div className="flex items-center gap-2 p-2">
            <button
              className="px-2 py-1 border rounded disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={resp.page <= 1 || loading}
            >
              Prev
            </button>
            <div>
              Page {resp.page} of {pageCount}
            </div>
            <button
              className="px-2 py-1 border rounded disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(p + 1, pageCount))}
              disabled={resp.page >= pageCount || loading}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
