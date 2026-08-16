import type { ButtonHTMLAttributes, ReactNode } from "react";
import Icon from "./Icon.js";
import type { IconName } from "./Icon.js";

export type ButtonVariant = "primary" | "secondary" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: IconName;
  iconOnly?: boolean;
  children: ReactNode;
}

export default function Button({
  variant = "primary",
  icon,
  iconOnly = false,
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
      aria-label={props["aria-label"] ?? iconOnlyLabel}
      title={props.title ?? iconOnlyLabel}
    >
      {icon && <Icon name={icon} size={18} />}

      {iconOnly ? (
        <span className="visually-hidden">{children}</span>
      ) : (
        children
      )}
    </button>
  );
}
