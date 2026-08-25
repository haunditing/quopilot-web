import type { InputHTMLAttributes, ReactNode } from "react";

type FieldType = "input" | "textarea" | "select";

/** Clase base de los controles de formulario del panel (select/input/textarea). */
export const FIELD_CONTROL_CLASS =
  "w-full h-[44px] px-3 py-2 rounded-lg border bg-surface-card text-sm text-ink-strong appearance-none outline-none resize-y transition-[border-color,box-shadow] duration-150 border-line-strong focus:border-accent focus:ring-[3px] ring-accent-soft disabled:bg-accent-soft disabled:text-ink-muted disabled:cursor-not-allowed";

/** Clase extra para textareas (altura auto). */
export const FIELD_TEXTAREA_CLASS = "h-auto min-h-[88px]";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
  helper?: ReactNode;
  /** Tipo de control; select/textarea reciben sus opciones como children. */
  as?: FieldType;
  /** Filas del textarea (cuando as="textarea"). */
  rows?: number;
  /** Texto de ayuda bajo el control. */
  hint?: ReactNode;
  children?: ReactNode;
}

/**
 * Átomo de formulario. Replica 1:1 el bloque FORMS del CSS legado
 * (label semibold + control 44px con foco accent + asterisco en
 * requeridos + estados invalid/disabled) usando utilidades Tailwind.
 */
export default function Field({
  id,
  label,
  error,
  helper,
  as = "input",
  hint,
  children,
  className,
  ...inputProps
}: FieldProps) {
  const required = Boolean(inputProps.required);

  const controlClass = [
    FIELD_CONTROL_CLASS,
    error
      ? "border-danger focus:border-danger focus:ring-[3px] ring-rose-500/12"
      : "",
    as === "textarea" ? FIELD_TEXTAREA_CLASS : "",
    className || "",
  ]
    .filter(Boolean)
    .join(" ");

  const control =
    as === "select" ? (
      <select id={id} className={controlClass} {...(inputProps as object)}>
        {children}
      </select>
    ) : as === "textarea" ? (
      <textarea id={id} className={controlClass} {...(inputProps as object)} />
    ) : (
      <input id={id} className={controlClass} {...inputProps} />
    );

  return (
    <div className="flex flex-col gap-[7px]">
      <label htmlFor={id} className="text-ink-strong text-sm font-semibold">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>

      {control}

      {hint && <div className="text-xs text-ink-muted">{hint}</div>}

      {helper && <div className="text-xs text-ink-muted">{helper}</div>}

      {error && (
        <span role="alert" className="m-0 text-xs text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
