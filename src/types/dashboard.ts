export interface AgentDashboardSummary {
  quotes: {
    total: number;
    pending: number;
    accepted: number;
  };

  sales: {
    total: number;
    amount: number;
  };

  customers: {
    total: number;
  };

  conversionRate: number;
}

export interface SuperAdminDashboardSummary {
  tenants: {
    total: number;
    active: number;
  };

  users: {
    total: number;
  };

  sales: {
    total: number;
    amount: number;
  };

  quotes: {
    total: number;
  };
}

export interface TenantDashboardSummary {
  quotes: {
    total: number;
    sent: number;
    accepted: number;
  };

  sales: {
    total: number;
    amount: number;
  };

  customers: {
    total: number;
  };

  products: {
    total: number;
  };

  agents: {
    total: number;
  };

  conversionRate: number;
}
