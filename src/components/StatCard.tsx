interface StatCardProps {
  label: string;
  value: string;
  highlight?: boolean;
}

export default function StatCard({ label, value, highlight }: StatCardProps) {
  return (
    <article
      className={`min-w-0 rounded-xl border p-4 md:p-5 bg-surface-card shadow-card ${
        highlight
          ? "border-accent-border bg-accent-soft"
          : "border-line"
      }`}
    >
      <span className="block mb-2.5 text-sm text-ink-muted">{label}</span>

      <strong className="block text-ink-strong text-2xl md:text-[28px] leading-[1.2] [overflow-wrap:anywhere]">
        {value}
      </strong>
    </article>
  );
}
