import type { ButtonHTMLAttributes, ReactNode } from "react";
import Icon from "./Icon.js";
import type { IconName } from "./Icon.js";
import { LoadingGlyph } from "./Loading.js";

export type ButtonVariant = "primary" | "secondary" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: IconName;
  iconOnly?: boolean;
  loading?: boolean;
  children: ReactNode;
}

export default function Button({
  variant = "primary",
  icon,
  iconOnly = false,
  loading = false,
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = ["button", `button--${variant}`];

  if (iconOnly) {
    classes.push("button--icon");
  }

  if (className) {
    classes.push(className);
  }

  const iconOnlyLabel =
    iconOnly && typeof children === "string" ? children : undefined;

  return (
    <button
      type="button"
      className={classes.join(" ")}
      {...props}
      disabled={loading || props.disabled}
      aria-label={props["aria-label"] ?? iconOnlyLabel}
      title={props.title ?? iconOnlyLabel}
    >
      {loading ? (
        <LoadingGlyph size="xs" className="button__spinner" />
      ) : (
        icon && <Icon name={icon} size={18} />
      )}

      {iconOnly ? (
        <span className="visually-hidden">{children}</span>
      ) : (
        children
      )}
    </button>
  );
}
