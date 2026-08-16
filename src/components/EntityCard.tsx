import type { ReactNode } from "react";
import CardActions from "./CardActions.js";
import type { EntityAction } from "./CardActions.js";
import StatusBadge from "./StatusBadge.js";

export type { EntityAction } from "./CardActions.js";

export interface EntityField {
  label: string;
  value: string;
}

interface EntityCardProps {
  eyebrow: string;
  title: string;
  fields: EntityField[];
  status?: string;
  actions?: EntityAction[];
  children?: ReactNode;
}

export default function EntityCard({
  eyebrow,
  title,
  fields,
  status,
  actions,
  children,
}: EntityCardProps) {
  return (
    <article className="entity-card">
      <div className="entity-card__header">
        <div>
          <span className="entity-card__eyebrow">{eyebrow}</span>

          <h2>{title}</h2>
        </div>

        {status && <StatusBadge status={status} />}
      </div>

      {children}

      <div className="entity-card__body">
        {fields.map((field) => (
          <div key={field.label}>
            <span className="entity-card__label">{field.label}</span>

            <strong className="entity-card__value">{field.value}</strong>
          </div>
        ))}
      </div>

      {actions && actions.length > 0 && <CardActions actions={actions} />}
    </article>
  );
}
