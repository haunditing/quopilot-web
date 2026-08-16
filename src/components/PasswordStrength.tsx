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
    <div className="password-strength">
      <div
        className={`password-strength__bar password-strength__bar--score-${strength.score}`}
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
                ? "password-strength__segment password-strength__segment--filled"
                : "password-strength__segment"
            }
          />
        ))}
      </div>

      <span className="password-strength__label">{strength.label}</span>
    </div>
  );
}
