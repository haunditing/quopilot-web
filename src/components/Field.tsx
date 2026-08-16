import type { InputHTMLAttributes, ReactNode } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
  helper?: ReactNode;
}

export default function Field({
  id,
  label,
  error,
  helper,
  ...inputProps
}: FieldProps) {
  const className = error ? "form-field form-field--invalid" : "form-field";

  return (
    <div className={className}>
      <label htmlFor={id}>{label}</label>

      <input id={id} {...inputProps} />

      {helper && <div className="form-field__helper">{helper}</div>}

      {error && <span className="form-field__error">{error}</span>}
    </div>
  );
}
