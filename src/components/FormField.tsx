import type { ReactNode } from "react";

/**
 * Molécula: contenedor semántico para grupos de formulario complejos
 * (pickers personalizados, controles compuestos) que no encajan en
 * el átomo <Field>. Sustituye al div.form-field del CSS legado.
 */
export interface FormFieldProps {
  label: ReactNode;
  /** id del control principal, para asociar el label. */
  idFor?: string;
  /** Mensaje de validación (tiene prioridad sobre hint). */
  error?: ReactNode;
  /** Texto de ayuda mostrado cuando no hay error. */
  hint?: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

export default function FormField({
  label,
  idFor,
  error,
  hint,
  required = false,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={`flex flex-col gap-[7px] ${className || ""}`}>
      <label
        htmlFor={idFor}
        className="text-sm font-semibold text-ink-strong"
      >
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>

      {children}

      {error ? (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      ) : hint ? (
        <div className="text-xs text-ink-muted">{hint}</div>
      ) : null}
    </div>
  );
}
