export default function InsightCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <div className="rounded-2xl bg-white p-4 shadow border text-neutral-900">
        <h3 className="font-semibold mb-2">{title}</h3>
        <div className="text-sm whitespace-pre-wrap">{children}</div>
      </div>
    )
  }
  