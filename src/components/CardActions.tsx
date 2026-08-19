import Icon from "./Icon.js";
import type { IconName } from "./Icon.js";
import Spinner from "./Spinner.js";

export interface EntityAction {
  icon?: IconName;
  label?: string;
  ariaLabel?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
  busy?: boolean;
}

interface CardActionsProps {
  actions: EntityAction[];
}

function actionClassName(
  variant: EntityAction["variant"],
  hasLabel: boolean,
): string {
  const base = ["entity-card__action"];

  if (!hasLabel) {
    base.push("entity-card__action--icon");
  }

  if (variant && variant !== "primary") {
    base.push(`entity-card__action--${variant}`);
  }

  return base.join(" ");
}

export default function CardActions({ actions }: CardActionsProps) {
  return (
    <div className="entity-card__actions">
      {actions.map((action) => {
        const hasLabel = Boolean(action.label);
        const accessibleLabel = action.ariaLabel ?? action.label ?? "Acción";
        const className = actionClassName(action.variant, hasLabel);

        return (
          <button
            key={accessibleLabel}
            type={action.type ?? "button"}
            className={className}
            onClick={action.onClick}
            aria-label={accessibleLabel}
            title={hasLabel ? undefined : accessibleLabel}
            disabled={action.busy || action.disabled}
          >
            {action.busy ? (
              <Spinner size="xs" className="entity-card__action-spinner" />
            ) : (
              action.icon && <Icon name={action.icon} size={18} />
            )}

            {hasLabel && <span>{action.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
