// frontend/src/components/FiltersBar.tsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

/* ----------------------------- Types ----------------------------- */

type SchemaResp = {
  categorical: string[];
  datetime?: string[];
  numeric?: string[];
  columns?: string[];
  dtypes?: Record<string, string>;
};

type DistinctResp = { values: string[] };

/* --------------------------- Constants --------------------------- */

const MAX_FILTER_COLUMNS = 6;
const DISTINCT_LIMIT = 200;

/* --------------------------- Component --------------------------- */

export default function FiltersBar({
  workspaceId,
  onChange,
}: {
  workspaceId: string;
  onChange: (f: Record<string, string[]>) => void;
}) {
  const [categorical, setCategorical] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, string[]>>({});
  const [sel, setSel] = useState<Record<string, string[]>>({});
  const [schemaErr, setSchemaErr] = useState<string | null>(null);
  const [distinctErr, setDistinctErr] = useState<string | null>(null);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [loadingDistinct, setLoadingDistinct] = useState(false);

  // We only fetch distincts for the first few categorical columns to keep it fast.
  const columnsToFetch = useMemo(
    () => categorical.slice(0, MAX_FILTER_COLUMNS),
    [categorical]
  );

  /* ---------------------------- Load schema ---------------------------- */

  useEffect(() => {
    if (!workspaceId) {
      setCategorical([]);
      setValues({});
      setSel({});
      return;
    }

    let alive = true;
    const ctrl = new AbortController();

    (async () => {
      try {
        setLoadingSchema(true);
        setSchemaErr(null);
        setCategorical([]);
        setValues({});
        setSel({});

        const { data } = await api.get<SchemaResp>(`/api/${workspaceId}/schema`, {
          signal: ctrl.signal,
        });

        if (!alive) return;

        const rawCats = Array.isArray(data?.categorical) ? data.categorical : [];
        const dts = Array.isArray(data?.datetime) ? data.datetime! : [];
        const nums = Array.isArray(data?.numeric) ? data.numeric! : [];

        // Some backends include all columns in "categorical"; remove datetime/numeric.
        const bad = new Set<string>([...dts, ...nums]);
        const cleanCats = rawCats.filter((c) => !bad.has(c));

        setCategorical(cleanCats);
      } catch (e) {
        if (!alive) return;
        const name = (e as { name?: string })?.name;
        if (name === "CanceledError" || name === "AbortError") return;
        setSchemaErr("Failed to load schema.");
      } finally {
        if (alive) setLoadingSchema(false);
      }
    })();

    return () => {
      alive = false;
      ctrl.abort();
    };
  }, [workspaceId]);

  /* ----------------------- Load distinct values ----------------------- */

  useEffect(() => {
    if (!workspaceId || columnsToFetch.length === 0) {
      setValues({});
      return;
    }

    let alive = true;
    const ctrl = new AbortController();

    (async () => {
      try {
        setLoadingDistinct(true);
        setDistinctErr(null);

        const out: Record<string, string[]> = {};

        await Promise.all(
          columnsToFetch.map(async (col) => {
            const { data } = await api.get<DistinctResp>(
              `/api/${workspaceId}/distinct`,
              {
                params: { col, limit: DISTINCT_LIMIT },
                signal: ctrl.signal,
              }
            );
            out[col] = Array.isArray(data?.values) ? data.values : [];
          })
        );

        if (!alive) return;
        setValues(out);
      } catch (e) {
        if (!alive) return;
        const name = (e as { name?: string })?.name;
        if (name === "CanceledError" || name === "AbortError") return;
        setDistinctErr("Failed to load filter values.");
        setValues({});
      } finally {
        if (alive) setLoadingDistinct(false);
      }
    })();

    return () => {
      alive = false;
      ctrl.abort();
    };
  }, [workspaceId, columnsToFetch]);

  /* ----------------------- Bubble selection up ----------------------- */

  useEffect(() => {
    onChange(sel);
  }, [sel, onChange]);

  /* ------------------------------- UI ------------------------------- */

  if (loadingSchema) {
    return <div className="text-sm text-neutral-500">Loading schema…</div>;
  }

  return (
    <div className="flex flex-wrap gap-4 items-start">
      {(schemaErr || distinctErr) && (
        <div className="text-sm text-red-600">{schemaErr || distinctErr}</div>
      )}

      {Object.entries(values).map(([col, opts]) => (
        <label key={col} className="text-sm">
          <div className="mb-1 font-medium">{col}</div>

          <select
            multiple
            className="border rounded px-2 py-1 min-w-56 h-28"
            value={sel[col] || []}
            onChange={(e) => {
              const list = Array.from(e.target.selectedOptions).map((o) => o.value);
              setSel((s) => ({ ...s, [col]: list }));
            }}
            aria-label={`Filter ${col}`}
          >
            {opts.map((v) => (
              <option key={`${col}-${v}`} value={v}>
                {v}
              </option>
            ))}
          </select>

          {(sel[col]?.length ?? 0) > 0 && (
            <div className="mt-1">
              <button
                type="button"
                className="text-xs underline text-neutral-600 hover:text-neutral-800"
                onClick={() =>
                  setSel((s) => {
                    const next = { ...s };
                    delete next[col];
                    return next;
                  })
                }
              >
                Clear
              </button>
            </div>
          )}
        </label>
      ))}

      {loadingDistinct && (
        <div className="text-sm text-neutral-500">Loading values…</div>
      )}

      {Object.keys(sel).length > 0 && (
        <button
          type="button"
          className="text-sm px-3 py-1.5 rounded-xl border bg-white hover:bg-gray-50"
          onClick={() => setSel({})}
          title="Clear all selected filters"
        >
          Reset filters
        </button>
      )}
    </div>
  );
}
