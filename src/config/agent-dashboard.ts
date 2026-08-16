import type { AgentDashboardSummary } from "../types/dashboard.js";
import type { DashboardConfig } from "../types/dashboard-ui.js";

export function createAgentDashboard(
  summary: AgentDashboardSummary,
): DashboardConfig {
  return {
    title: "Mi dashboard",
    description: "Tu actividad comercial",

    sections: [
      {
        id: "commercial-summary",
        title: "Resumen comercial",
        description: "Estado actual de tus cotizaciones y conversión.",

        cards: [
          {
            id: "quotes-total",
            type: "count",
            title: "Cotizaciones",
            value: summary.quotes.total,
            description: "Total de tus cotizaciones",
          },

          {
            id: "quotes-pending",
            type: "count",
            title: "Pendientes",
            value: summary.quotes.pending,
            description: "Cotizaciones en proceso",
          },

          {
            id: "quotes-accepted",
            type: "count",
            title: "Aceptadas",
            value: summary.quotes.accepted,
            description: "Cotizaciones aceptadas",
            highlight: true,
          },

          {
            id: "conversion-rate",
            type: "percentage",
            title: "Conversión",
            value: summary.conversionRate,
            description: "Relación entre cotizaciones y aceptaciones",
          },
        ],
      },

      {
        id: "sales-summary",
        title: "Ventas",
        description: "Resultado de tus ventas confirmadas.",

        cards: [
          {
            id: "sales-total",
            type: "count",
            title: "Ventas confirmadas",
            value: summary.sales.total,
          },

          {
            id: "sales-amount",
            type: "currency",
            title: "Monto vendido",
            value: summary.sales.amount,
            highlight: true,
          },

          {
            id: "customers-total",
            type: "count",
            title: "Clientes",
            value: summary.customers.total,
          },
        ],
      },
    ],
  };
}
