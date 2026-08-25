// src/banners/condition-evaluator.ts (quopilot-web)

import type { BannerCondition, BannerContext } from "../types/banner";

/**
 * Evalúa TODAS las condiciones de un banner (AND lógico) contra el contexto
 * del usuario actual. Reglas:
 *  - `eq` / `neq` comparan como strings (case-insensibles).
 *  - `in` usa `valueList` (los valores se comparan como strings).
 *  - `gte` / `lte` comparan numéricamente.
 */
export function evaluateConditions(
  conditions: BannerCondition[],
  ctx: BannerContext,
): boolean {
  return conditions.every((cond) => {
    const actual = ctx[cond.field];
    const expected = cond.value;

    switch (cond.op) {
      case "eq":
        return String(actual).toLowerCase() === String(expected).toLowerCase();
      case "neq":
        return String(actual).toLowerCase() !== String(expected).toLowerCase();
      case "in":
        return (cond.valueList ?? []).map(String).includes(String(actual));
      case "gte":
        return Number(actual) >= Number(expected);
      case "lte":
        return Number(actual) <= Number(expected);
      default:
        return true;
    }
  });
}
