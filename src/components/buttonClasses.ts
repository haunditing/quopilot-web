export type ButtonVariant = "primary" | "secondary" | "danger";

const variantClass: Record<ButtonVariant, string> = {
  primary: "",
  secondary:
    "border-line bg-surface-card text-ink-strong hover:border-accent-border hover:bg-accent-soft hover:text-accent",
  danger: "border-red-200 bg-red-50 text-danger hover:bg-danger hover:text-white",
};

/** Clases compartidas para estilar links/anchors igual que <Button>. */
export function buttonClassNames({
  variant = "primary",
  iconOnly = false,
  className,
}: {
  variant?: ButtonVariant;
  iconOnly?: boolean;
  className?: string;
} = {}) {
  return [
    "inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 border border-transparent rounded-lg font-semibold cursor-pointer transition-[background-color,border-color,color,opacity] duration-150 active:not-disabled:translate-y-px disabled:opacity-60 disabled:cursor-default",
    variantClass[variant],
    iconOnly ? "shrink-0 w-11 p-0" : "",
    className || "",
  ]
    .filter(Boolean)
    .join(" ");
}
