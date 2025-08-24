// frontend/src/components/DataTable.tsx
import React from 'react'

type Props = {
  columns: string[]
  rows: Record<string, unknown>[]
  total: number
  page: number
  pageSize: number
  onPageChange: (p: number) => void
}

export default function DataTable({ columns, rows, total, page, pageSize, onPageChange }: Props) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const canPrev = page > 1
  const canNext = page < pages

  return (
    <div className="rounded-2xl bg-white p-4 shadow border text-neutral-900">
      <div className="mb-2 flex items-center justify-between">
        <div className="font-semibold">Data preview</div>
        <div className="text-xs text-neutral-500">
          Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}
        </div>
      </div>

      <div className="overflow-auto rounded-xl border">
        <table className="min-w-[960px] text-sm">
          <thead>
            <tr className="bg-neutral-50">
              {columns.map((c) => (
                <th key={c} className="text-left p-2 border-b">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t">
                {columns.map((c) => (
                  <td key={c} className="p-2 whitespace-nowrap">
                    {String(r[c] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="p-4 text-center text-neutral-500" colSpan={columns.length}>
                  No rows
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-2 mt-3">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={!canPrev}
          className="px-3 py-1.5 rounded-xl border disabled:opacity-50"
        >
          Prev
        </button>
        <div className="text-sm px-2 py-1.5">
          Page {page} / {pages}
        </div>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!canNext}
          className="px-3 py-1.5 rounded-xl border disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}
