import type { ItemType, UnitOfMeasure } from "../types/product.js";

export const ITEM_TYPE_OPTIONS: Array<{ value: ItemType; label: string }> = [
  { value: "PRODUCT", label: "Producto" },
  { value: "SERVICE", label: "Servicio" },
  { value: "COMBO", label: "Combo / Kit" },
];

export const UNIT_OF_MEASURE_OPTIONS: Array<{
  value: UnitOfMeasure;
  label: string;
}> = [
  { value: "UNIT", label: "Unidades" },
  { value: "KG", label: "Kilos (kg)" },
  { value: "LB", label: "Libras (lb)" },
  { value: "LITER", label: "Litros" },
  { value: "METER", label: "Metros" },
  { value: "HOUR", label: "Horas" },
  { value: "PACKAGE", label: "Paquetes" },
  { value: "BOX", label: "Cajas" },
  { value: "SET", label: "Sets / Juegos" },
];

export const TAX_RATE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "0", label: "Ninguno (0%)" },
  { value: "5", label: "IVA 5%" },
  { value: "8", label: "IVA 8%" },
  { value: "16", label: "IVA 16%" },
  { value: "19", label: "IVA 19%" },
];

export const WAREHOUSE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "Principal", label: "Principal" },
  { value: "Bodega A", label: "Bodega A" },
  { value: "Bodega B", label: "Bodega B" },
  { value: "Local", label: "Local" },
];

export const PRODUCT_CATEGORY_OPTIONS: Array<{
  value: string;
  label: string;
}> = [
  { value: "General", label: "General" },
  { value: "Tecnología", label: "Tecnología" },
  { value: "Hogar", label: "Hogar" },
  { value: "Moda", label: "Moda" },
  { value: "Alimentos", label: "Alimentos" },
  { value: "Belleza", label: "Belleza" },
  { value: "Automotriz", label: "Automotriz" },
  { value: "Servicios", label: "Servicios" },
];

export const PRICE_LIST_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "general", label: "General" },
  { value: "mayorista", label: "Mayorista" },
  { value: "vip", label: "VIP" },
];

export const DEFAULT_PRICE_LISTS = [
  { priceListId: "general", priceListName: "General", price: 0 },
  { priceListId: "mayorista", priceListName: "Mayorista", price: 0 },
  { priceListId: "vip", priceListName: "VIP", price: 0 },
] as const;