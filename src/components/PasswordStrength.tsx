import { getPasswordStrength } from "../lib/validation.js";

interface PasswordStrengthProps {
  value: string;
}

const TOTAL_SEGMENTS = 4;

export default function PasswordStrength({ value }: PasswordStrengthProps) {
  const strength = getPasswordStrength(value);

  if (!value) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1">
      <div
        className="flex gap-1"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={TOTAL_SEGMENTS}
        aria-valuenow={strength.score}
        aria-label="Fuerza de la contraseña"
      >
        {Array.from({ length: TOTAL_SEGMENTS }, (_, index) => (
          <span
            key={index}
            className={
              index < strength.score
                ? "flex-1 h-1.5 rounded-full bg-accent transition-colors duration-150"
                : "flex-1 h-1.5 rounded-full bg-line transition-colors duration-150"
            }
          />
        ))}
      </div>

      <span className="text-xs text-ink-muted">{strength.label}</span>
    </div>
  );
}
