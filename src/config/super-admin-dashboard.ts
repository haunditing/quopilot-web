import type { SuperAdminDashboardSummary } from "../types/dashboard.js";
import type { DashboardConfig } from "../types/dashboard-ui.js";

export function createSuperAdminDashboard(
  summary: SuperAdminDashboardSummary,
): DashboardConfig {
  return {
    title: "Panel de administración",
    description: "Visión general de la plataforma",

    sections: [
      {
        id: "platform-overview",
        title: "Plataforma",
        description: "Estado general de QuoPilot.",

        cards: [
          {
            id: "tenants-total",
            type: "count",
            title: "Empresas",
            value: summary.tenants.total,
            description: "Empresas registradas",
            highlight: true,
          },

          {
            id: "tenants-active",
            type: "count",
            title: "Empresas activas",
            value: summary.tenants.active,
          },

          {
            id: "users-total",
            type: "count",
            title: "Usuarios",
            value: summary.users.total,
          },
        ],
      },

      {
        id: "platform-activity",
        title: "Actividad global",
        description: "Actividad comercial acumulada de la plataforma.",

        cards: [
          {
            id: "quotes-total",
            type: "count",
            title: "Cotizaciones",
            value: summary.quotes.total,
          },

          {
            id: "sales-total",
            type: "count",
            title: "Ventas",
            value: summary.sales.total,
            description: "Ventas confirmadas",
          },

          {
            id: "sales-amount",
            type: "currency",
            title: "Volumen vendido",
            value: summary.sales.amount,
            description: "Total de la plataforma",
            highlight: true,
          },
        ],
      },
    ],
  };
}
