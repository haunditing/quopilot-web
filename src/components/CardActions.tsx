import Icon from "./Icon.js";
import type { IconName } from "./Icon.js";
import { LoadingGlyph } from "./Loading.js";

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
  const classes = [
    "inline-flex items-center justify-center gap-2 w-full min-h-10 px-3.5 py-2.5 rounded-lg font-semibold cursor-pointer transition-colors duration-150",
    "border border-accent-border bg-accent-soft text-accent hover:bg-accent hover:border-accent hover:text-white",
  ];

  if (!hasLabel) {
    classes.push("shrink-0 w-11 min-h-11 p-0 !border-transparent !bg-transparent");
  }

  if (variant === "secondary") {
    classes.push("!border-line !bg-surface-card !text-ink-strong hover:!bg-accent-soft");
  } else if (variant === "danger") {
    classes.push("!border-red-200 !bg-red-50 !text-danger hover:!bg-danger hover:!text-white");
  }

  return classes.join(" ");
}

export default function CardActions({ actions }: CardActionsProps) {
  return (
    <div className="flex items-center gap-2">
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
              <LoadingGlyph size="xs" className="entity-card__action-spinner" />
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
