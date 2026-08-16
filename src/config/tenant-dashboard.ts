import type { TenantDashboardSummary } from "../types/dashboard.js";
import type { DashboardConfig } from "../types/dashboard-ui.js";

export function createTenantDashboard(
  summary: TenantDashboardSummary,
): DashboardConfig {
  return {
    title: "Dashboard",
    description: "Resumen comercial de tu empresa",

    sections: [
      {
        id: "business-overview",
        title: "Resumen del negocio",
        description: "Visión general de la actividad de tu empresa.",

        cards: [
          {
            id: "sales-total",
            type: "count",
            title: "Ventas",
            value: summary.sales.total,
            description: "Ventas confirmadas",
            highlight: true,
          },

          {
            id: "sales-amount",
            type: "currency",
            title: "Facturación",
            value: summary.sales.amount,
            description: "Monto vendido",
            highlight: true,
          },

          {
            id: "customers-total",
            type: "count",
            title: "Clientes",
            value: summary.customers.total,
            description: "Clientes registrados",
          },

          {
            id: "conversion-rate",
            type: "percentage",
            title: "Conversión",
            value: summary.conversionRate,
            description: "Cotizaciones aceptadas",
          },
        ],
      },

      {
        id: "quote-management",
        title: "Cotizaciones",
        description: "Estado del proceso comercial.",

        cards: [
          {
            id: "quotes-total",
            type: "count",
            title: "Total",
            value: summary.quotes.total,
          },

          {
            id: "quotes-sent",
            type: "count",
            title: "Enviadas",
            value: summary.quotes.sent,
          },

          {
            id: "quotes-accepted",
            type: "count",
            title: "Aceptadas",
            value: summary.quotes.accepted,
            highlight: true,
          },
        ],
      },

      {
        id: "operation",
        title: "Operación",
        description: "Recursos de tu empresa.",

        cards: [
          {
            id: "agents-total",
            type: "count",
            title: "Agentes",
            value: summary.agents.total,
          },

          {
            id: "products-total",
            type: "count",
            title: "Productos",
            value: summary.products.total,
          },
        ],
      },
    ],
  };
}
