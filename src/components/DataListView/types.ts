import React from "react";

export interface FilterOptionI {
  key: string;
  label: string;
  type: "select" | "date" | "text";
  options?: Array<{ label: string; value: string }>;
}

export interface ColumnSpec<T = Record<string, unknown>> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  align?: "left" | "center" | "right";
}

export interface DataListViewProps<T = Record<string, unknown>> {
  items: T[];
  columns: ColumnSpec<T>[];
  rowKey: (item: T) => string | number;
  filters?: FilterOptionI[];
  pageSize?: number;
  onFilterChange?: (filters: Record<string, string>) => void;
  onPageChange?: (page: number) => void;
  onPrimaryAction?: () => void;
  onExport?: () => void;
  onRowClick?: (item: T) => void;
  totalItems?: number;
  loading?: boolean;
  emptyState?: React.ReactNode;
}
