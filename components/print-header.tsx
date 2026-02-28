export function PrintHeader({ title }: { title: string }) {
  return (
    <div className="print-header hidden">
      <h1>{"DASTA"}</h1>
      <p>{title}</p>
      <p>{new Date().toLocaleDateString("ka-GE")} {new Date().toLocaleTimeString("ka-GE")}</p>
    </div>
  )
}
