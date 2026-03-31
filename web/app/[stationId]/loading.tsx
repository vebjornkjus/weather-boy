export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-4 h-4 w-24 rounded bg-stone-200" />
      <div className="mb-1 h-8 w-48 rounded bg-stone-200" />
      <div className="mb-6 h-4 w-64 rounded bg-stone-200" />

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-lg border border-stone-200 bg-white p-4">
            <div className="mb-2 h-4 w-32 rounded bg-stone-100" />
            <div className="h-3 w-48 rounded bg-stone-100" />
          </div>
        ))}
      </div>

      <div className="h-64 rounded-lg border border-stone-200 bg-white" />
    </div>
  );
}
