import type {
  FilterFieldConfig,
  FilterOption,
} from "../components/FilterPanel.js";
import { CURRENCY_OPTIONS } from "./options.js";

export { CURRENCY_OPTIONS };

export const USER_STATUS_OPTIONS: FilterOption[] = [
  { value: "ACTIVE", label: "Activo" },
  { value: "INACTIVE", label: "Inactivo" },
  { value: "SUSPENDED", label: "Suspendido" },
];

export const PRODUCT_STATUS_OPTIONS: FilterOption[] = [
  { value: "ACTIVE", label: "Activo" },
  { value: "INACTIVE", label: "Inactivo" },
];

export const SALE_STATUS_OPTIONS: FilterOption[] = [
  { value: "CONFIRMED", label: "Confirmada" },
  { value: "CANCELLED", label: "Cancelada" },
];

export const QUOTE_STATUS_OPTIONS: FilterOption[] = [
  { value: "DRAFT", label: "Borrador" },
  { value: "SENT", label: "Enviada" },
  { value: "VIEWED", label: "Vista" },
  { value: "ACCEPTED", label: "Aceptada" },
  { value: "REJECTED", label: "Rechazada" },
  { value: "EXPIRED", label: "Expirada" },
];

export const CUSTOMER_FILTER_FIELDS: FilterFieldConfig[] = [
  {
    type: "text",
    id: "country",
    label: "País",
    placeholder: "Filtrar por país",
  },
];

export const PRODUCT_FILTER_FIELDS: FilterFieldConfig[] = [
  {
    type: "select",
    id: "status",
    label: "Estado",
    placeholder: "Todos",
    options: PRODUCT_STATUS_OPTIONS,
  },
  {
    type: "select",
    id: "currency",
    label: "Moneda",
    placeholder: "Todas",
    options: CURRENCY_OPTIONS,
  },
  {
    type: "number-range",
    id: "price",
    label: "Precio",
    placeholderFrom: "Desde",
    placeholderTo: "Hasta",
  },
];

export const SALE_FILTER_FIELDS = (options: {
  customers: FilterOption[];
  products: FilterOption[];
}): FilterFieldConfig[] => [
  {
    type: "select",
    id: "status",
    label: "Estado",
    placeholder: "Todos",
    options: SALE_STATUS_OPTIONS,
  },
  {
    type: "select",
    id: "customerId",
    label: "Cliente",
    placeholder: "Todos",
    options: options.customers,
  },
  {
    type: "select",
    id: "productId",
    label: "Producto",
    placeholder: "Todos",
    options: options.products,
  },
  {
    type: "number-range",
    id: "total",
    label: "Valor",
    placeholderFrom: "Desde",
    placeholderTo: "Hasta",
  },
  {
    type: "date-range",
    id: "date",
    label: "Fecha",
  },
];

export const QUOTE_FILTER_FIELDS = (
  customers: FilterOption[],
): FilterFieldConfig[] => [
  {
    type: "select",
    id: "status",
    label: "Estado",
    placeholder: "Todos",
    options: QUOTE_STATUS_OPTIONS,
  },
  {
    type: "select",
    id: "customerId",
    label: "Cliente",
    placeholder: "Todos",
    options: customers,
  },
];

export const USER_FILTER_FIELDS: FilterFieldConfig[] = [
  {
    type: "select",
    id: "status",
    label: "Estado",
    placeholder: "Todos",
    options: USER_STATUS_OPTIONS,
  },
  {
    type: "date-range",
    id: "date",
    label: "Registro",
  },
];

export const TENANT_FILTER_FIELDS: FilterFieldConfig[] = [
  {
    type: "select",
    id: "status",
    label: "Estado",
    placeholder: "Todos",
    options: USER_STATUS_OPTIONS,
  },
];

export const CHANNEL_TYPE_OPTIONS: FilterOption[] = [
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "WEB_CHAT", label: "Chat Web" },
  { value: "INSTAGRAM", label: "Instagram" },
];

export const CHANNEL_STATUS_OPTIONS: FilterOption[] = PRODUCT_STATUS_OPTIONS;

export const CHANNEL_FILTER_FIELDS: FilterFieldConfig[] = [
  {
    type: "select",
    id: "type",
    label: "Canal",
    placeholder: "Todos",
    options: CHANNEL_TYPE_OPTIONS,
  },
  {
    type: "select",
    id: "status",
    label: "Estado",
    placeholder: "Todos",
    options: CHANNEL_STATUS_OPTIONS,
  },
];
