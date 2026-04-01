export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-5 h-9 w-28 rounded-full bg-white/30" />

      <div className="mb-6">
        <div className="mb-1 h-7 w-44 rounded-lg bg-white/30" />
        <div className="mb-3 h-3 w-32 rounded bg-white/20" />
        <div className="h-14 w-24 rounded-lg bg-white/20" />
      </div>

      <div className="mb-3 h-3 w-20 rounded bg-white/20" />
      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card rounded-2xl p-5 h-28">
            <div className="mb-3 h-3 w-24 rounded bg-white/30" />
            <div className="h-7 w-16 rounded bg-white/20" />
          </div>
        ))}
      </div>

      <div className="glass-card rounded-2xl h-72" />
    </div>
  );
}
