const brand = [
  ["brand-950", "#0A0A3C"],
  ["brand-900", "#14136B"],
  ["brand-800", "#2A1EBA"],
  ["brand-700", "#3B2BC9"],
  ["brand-600", "#4A2ADE"],
  ["brand-500", "#5B4EF0"],
  ["brand-400", "#8A82F5"],
  ["brand-300", "#AEAEEA"],
  ["brand-200", "#C6C6F6"],
  ["brand-100", "#DCDAFB"],
  ["brand-50", "#F1F0FE"],
] as const;

const semantic = [
  ["safe", "#23AF5F", "Good / in range"],
  ["caution", "#FFAF23", "Borderline / needs review"],
  ["danger", "#EA2A36", "Out of range / emergency"],
] as const;

/**
 * Phase 1 token proof. Replaced by the A1 splash screen in Phase 3.
 */
export default function TokenProofPage() {
  return (
    <main className="mx-auto max-w-[390px] px-5 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Baymax</h1>
      <p className="text-ink-500 mt-1 text-sm">
        Phase 1 foundation. Tokens sampled from the design frames.
      </p>

      <h2 className="mt-8 text-lg font-semibold">Brand</h2>
      <div className="rounded-card shadow-e1 mt-3 overflow-hidden">
        {brand.map(([name, hex]) => (
          <div key={name} className="bg-surface flex items-center gap-3 px-4 py-2">
            <span className="border-line size-8 rounded-lg border" style={{ background: hex }} />
            <span className="text-sm font-medium">{name}</span>
            <span className="text-ink-300 ml-auto text-xs">{hex}</span>
          </div>
        ))}
      </div>

      <h2 className="mt-8 text-lg font-semibold">Semantic — health meaning only</h2>
      <div className="mt-3 space-y-2">
        {semantic.map(([name, hex, meaning]) => (
          <div key={name} className="rounded-tile bg-surface shadow-e1 flex items-center gap-3 p-3">
            <span className="size-8 rounded-lg" style={{ background: hex }} />
            <div>
              <p className="text-sm font-medium">{name}</p>
              <p className="text-ink-500 text-xs">{meaning}</p>
            </div>
            <span className="text-ink-300 ml-auto text-xs">{hex}</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="rounded-pill bg-brand-700 mt-8 h-14 w-full text-base font-semibold text-white"
      >
        Let&apos;s get started
      </button>
    </main>
  );
}
