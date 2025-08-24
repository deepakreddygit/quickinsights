import { useState } from 'react'
import axios, { AxiosError } from 'axios'
import { api } from '../lib/api'

type Profile = {
  shape: [number, number]
  numeric: string[]
  datetime: string[]
  categorical: string[]
  null_pct: Record<string, number>
  columns: string[]
}

type UploadResponse = { workspace_id: string; profile: Profile }
type Props = { onUploaded: (r: UploadResponse) => void }

type ErrorResponse = { error?: string }

export default function FileDropzone({ onUploaded }: Props) {
  const [drag, setDrag] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string>('')

  async function handleFiles(files: FileList | null) {
    if (!files || !files[0]) return
    setErr('')
    setBusy(true)
    try {
      const form = new FormData()
      form.append('file', files[0])
      const { data } = await api.post<UploadResponse>('/upload/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onUploaded(data)
    } catch (e: unknown) {
      let msg = 'Upload failed'
      if (axios.isAxiosError(e)) {
        const body = (e as AxiosError<ErrorResponse>).response?.data
        if (body?.error) msg = body.error
      }
      setErr(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files) }}
      className={`border-2 border-dashed rounded-2xl p-8 text-center transition
        ${drag ? 'border-brand-600 bg-brand-50/50' : 'border-neutral-300 bg-white'}
        text-neutral-900`}
    >
      <p className="mb-2 font-medium">Drop a CSV here or</p>
        <label
    className="inline-block px-4 py-2 rounded-xl border border-gray-300 text-black bg-white cursor-pointer hover:bg-gray-100 transition"
    >
    Browse
    <input
        type="file"
        accept=".csv"
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
    />
    </label>

      {busy && <p className="mt-2 text-sm">Uploading…</p>}
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
    </div>
  )
}

