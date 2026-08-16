export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PHONE_E164_PATTERN = /^\+[1-9]\d{7,14}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export function isValidPhone(value: string): boolean {
  return PHONE_E164_PATTERN.test(value.trim());
}

export function normalizePhoneInput(value: string): string {
  let normalized = value.replace(/[^\d+]/g, "");

  if (!normalized.startsWith("+")) {
    normalized = normalized ? `+${normalized}` : "";
  }

  const plusCount = (normalized.match(/\+/g) ?? []).length;

  if (plusCount > 1) {
    normalized = `+${normalized.replace(/\+/g, "")}`;
  }

  return normalized;
}

export interface PasswordStrengthResult {
  score: number;
  label: string;
}

const STRENGTH_LABELS = [
  "Muy débil",
  "Débil",
  "Media",
  "Fuerte",
  "Muy fuerte",
];

export function getPasswordStrength(value: string): PasswordStrengthResult {
  let score = 0;

  if (value.length >= 8) {
    score += 1;
  }

  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) {
    score += 1;
  }

  if (/\d/.test(value)) {
    score += 1;
  }

  if (/[^A-Za-z0-9]/.test(value)) {
    score += 1;
  }

  return {
    score,
    label: STRENGTH_LABELS[score],
  };
}
