export type DashboardCardType = "stat" | "currency" | "percentage" | "count";

export interface DashboardCardConfig {
  id: string;
  type: DashboardCardType;
  title: string;
  value: number | string;
  description?: string;
  highlight?: boolean;
}

export interface DashboardSectionConfig {
  id: string;
  title?: string;
  description?: string;
  cards: DashboardCardConfig[];
}

export interface DashboardConfig {
  title: string;
  description: string;
  sections: DashboardSectionConfig[];
}
