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

const variantClass: Record<ButtonVariant, string> = {
  primary: "",
  secondary:
    "border-line bg-surface-card text-ink-strong hover:border-accent-border hover:bg-accent-soft hover:text-accent",
  danger: "border-red-200 bg-red-50 text-danger hover:bg-danger hover:text-white",
};

export default function Button({
  variant = "primary",
  icon,
  iconOnly = false,
  loading = false,
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = [
    "inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 border border-transparent rounded-lg font-semibold cursor-pointer transition-[background-color,border-color,color,opacity] duration-150 active:not-disabled:translate-y-px disabled:opacity-60 disabled:cursor-default",
    variantClass[variant],
    iconOnly ? "shrink-0 w-11 p-0" : "",
    className || "",
  ];

  const iconOnlyLabel =
    iconOnly && typeof children === "string" ? children : undefined;

  return (
    <button
      type="button"
      className={classes.filter(Boolean).join(" ")}
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
