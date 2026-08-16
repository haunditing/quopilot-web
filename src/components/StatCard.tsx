interface StatCardProps {
  label: string;
  value: string;
  highlight?: boolean;
}

export default function StatCard({ label, value, highlight }: StatCardProps) {
  return (
    <article
      className={highlight ? "stat-card stat-card--highlight" : "stat-card"}
    >
      <span className="stat-card__label">{label}</span>

      <strong className="stat-card__value">{value}</strong>
    </article>
  );
}
