type SummaryItem = { label: string; value: number; description: string }

export default function WorkspaceSummary({ items }: { items: SummaryItem[] }) {
  return <dl className="workspace-summary">
    {items.map((item) => <div key={item.label}>
      <dt>{item.label}</dt><dd>{item.value}</dd><p>{item.description}</p>
    </div>)}
  </dl>
}
