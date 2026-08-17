import type { AgentTone } from "../types/agent.js";

export interface Option {
  value: string;
  label: string;
}

const FALLBACK_CURRENCIES = ["COP", "USD", "EUR"] as const;
const FALLBACK_TIMEZONES = ["America/Bogota", "America/Mexico_City", "UTC"] as const;

function toOptions(values: readonly string[]): Option[] {
  return values.map((value) => ({ value, label: value }));
}

const supportsSupportedValuesOf = typeof Intl.supportedValuesOf === "function";

export const CURRENCY_OPTIONS: Option[] = supportsSupportedValuesOf
  ? toOptions(Intl.supportedValuesOf("currency"))
  : toOptions(FALLBACK_CURRENCIES);

export const TIMEZONE_OPTIONS: Option[] = supportsSupportedValuesOf
  ? toOptions(Intl.supportedValuesOf("timeZone"))
  : toOptions(FALLBACK_TIMEZONES);

export interface AgentToneOption {
  value: AgentTone;
  label: string;
}

export const AGENT_TONE_OPTIONS: AgentToneOption[] = [
  { value: "PROFESSIONAL", label: "Profesional" },
  { value: "FRIENDLY", label: "Amigable" },
  { value: "FORMAL", label: "Formal" },
  { value: "CASUAL", label: "Casual" },
  { value: "EMPATHETIC", label: "Empático" },
];
