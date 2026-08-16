import type { ReactNode } from "react";
import CardActions from "./CardActions.js";
import type { EntityAction } from "./CardActions.js";
import StatusBadge from "./StatusBadge.js";

export interface DetailField {
  label: string;
  value: string;
}

export interface DetailSummary {
  label: string;
  value: string;
  highlight?: boolean;
}

interface DetailCardProps {
  eyebrow?: string;
  title: string;
  status?: string;
  summary?: DetailSummary[];
  fields?: DetailField[];
  actions?: EntityAction[];
  children?: ReactNode;
}

export default function DetailCard({
  eyebrow,
  title,
  status,
  summary,
  fields,
  actions,
  children,
}: DetailCardProps) {
  return (
    <article className="detail-card">
      {(eyebrow || status) && (
        <header className="detail-card__header">
          <div>
            {eyebrow && <span className="detail-card__eyebrow">{eyebrow}</span>}

            <h2 className="detail-card__title">{title}</h2>
          </div>

          {status && <StatusBadge status={status} />}
        </header>
      )}

      {summary && summary.length > 0 && (
        <div className="detail-card__summary">
          {summary.map((item) => (
            <div
              key={item.label}
              className={
                item.highlight
                  ? "detail-card__summary-item detail-card__summary-item--highlight"
                  : "detail-card__summary-item"
              }
            >
              <span className="detail-card__label">{item.label}</span>

              <strong className="detail-card__summary-value">
                {item.value}
              </strong>
            </div>
          ))}
        </div>
      )}

      {fields && fields.length > 0 && (
        <div className="detail-card__body">
          {fields.map((field) => (
            <div key={field.label}>
              <span className="detail-card__label">{field.label}</span>

              <strong className="detail-card__value">{field.value}</strong>
            </div>
          ))}
        </div>
      )}

      {actions && actions.length > 0 && <CardActions actions={actions} />}

      {children}
    </article>
  );
}
