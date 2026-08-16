import { formatCurrency, formatPercentage } from "../../lib/format.js";
import type { DashboardCardConfig } from "../../types/dashboard-ui.js";

interface DashboardCardProps {
  card: DashboardCardConfig;
}

function formatValue(
  type: DashboardCardConfig["type"],
  value: number | string,
): string {
  switch (type) {
    case "currency":
      return formatCurrency(value);

    case "percentage":
      return formatPercentage(value);

    case "count":
    case "stat":
    default:
      return String(value);
  }
}

export default function DashboardCard({ card }: DashboardCardProps) {
  return (
    <article
      className={
        card.highlight
          ? "dashboard-card dashboard-card--highlight"
          : "dashboard-card"
      }
    >
      <div className="dashboard-card__content">
        <span className="dashboard-card__title">{card.title}</span>

        <strong className="dashboard-card__value">
          {formatValue(card.type, card.value)}
        </strong>

        {card.description && (
          <span className="dashboard-card__description">
            {card.description}
          </span>
        )}
      </div>
    </article>
  );
}
