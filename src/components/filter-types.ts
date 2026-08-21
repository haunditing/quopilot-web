/**
 * Tipos de configuración de filtros para DataListView.
 *
 * Solo tipos: la UI de filtrado vive dentro de DataListView.
 */

export interface FilterOption {
  value: string;
  label: string;
}

export interface SelectFilterFieldConfig {
  type: "select";
  id: string;
  label: string;
  placeholder?: string;
  options: FilterOption[];
  loading?: boolean;
}

export interface TextFilterFieldConfig {
  type: "text";
  id: string;
  label: string;
  placeholder?: string;
}

export interface DateFilterFieldConfig {
  type: "date";
  id: string;
  label: string;
}

export interface DateRangeFilterFieldConfig {
  type: "date-range";
  id: string;
  label: string;
}

export interface NumberFilterFieldConfig {
  type: "number";
  id: string;
  label: string;
  placeholder?: string;
}

export interface NumberRangeFilterFieldConfig {
  type: "number-range";
  id: string;
  label: string;
  placeholderFrom?: string;
  placeholderTo?: string;
}

export type FilterFieldConfig =
  | SelectFilterFieldConfig
  | TextFilterFieldConfig
  | DateFilterFieldConfig
  | DateRangeFilterFieldConfig
  | NumberFilterFieldConfig
  | NumberRangeFilterFieldConfig;
