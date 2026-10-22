export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-pulse space-y-6">
      <div className="h-10 w-72 rounded-xl bg-brand-soft" />
      <div className="grid gap-5 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-36 rounded-lg bg-white" />)}
      </div>
      <div className="h-96 rounded-lg bg-white" />
    </div>
  );
}
