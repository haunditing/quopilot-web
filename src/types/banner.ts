// src/types/banner.ts (quopilot-web)

export type BannerSlot =
  | "header_global"
  | "dashboard_top"
  | "checkout_modal"
  | "sales_banner";

export type BannerType = "AlertBanner" | "InlineNotice" | "ModalNotice";

export type ConditionField = "plan" | "status" | "paymentStatus" | "role";
export type ConditionOperator = "eq" | "neq" | "in" | "gte" | "lte";

export interface BannerCondition {
  field: ConditionField;
  op: ConditionOperator;
  value: string | number;
  valueList?: Array<string | number>;
}

export interface BannerProps {
  variant?: string;
  title?: string;
  message: string;
  ctaText?: string;
  ctaUrl?: string;
}

export interface Banner {
  id: string;
  slot: BannerSlot;
  type: BannerType;
  priority: number;
  conditions: BannerCondition[];
  props: BannerProps;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Contexto del usuario actual sobre el que la app evalúa las condiciones. */
export interface BannerContext {
  plan?: string;
  status?: string;
  paymentStatus?: string;
  role?: string;
}
