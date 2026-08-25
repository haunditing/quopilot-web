const CURRENCY_LOCALE = "es-CO";
const DEFAULT_CURRENCY = "COP";

export function formatCurrency(
  value: number | string,
  currency: string = DEFAULT_CURRENCY,
): string {
  const amount = typeof value === "number" ? value : Number(value);

  if (Number.isNaN(amount)) {
    return String(value);
  }

  const ccy = currency || DEFAULT_CURRENCY;

  try {
    return new Intl.NumberFormat(CURRENCY_LOCALE, {
      style: "currency",
      currency: ccy,
    }).format(amount);
  } catch {
    return amount.toLocaleString(CURRENCY_LOCALE);
  }
}

export function formatNumber(value: number | string): string {
  const amount = typeof value === "number" ? value : Number(value);

  if (Number.isNaN(amount)) {
    return String(value);
  }

  return amount.toLocaleString(CURRENCY_LOCALE);
}

export function formatPercentage(value: number | string): string {
  return `${value}%`;
}

export function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString(CURRENCY_LOCALE);
}

export function formatDateTime(value: string | Date): string {
  return new Date(value).toLocaleString(CURRENCY_LOCALE);
}
