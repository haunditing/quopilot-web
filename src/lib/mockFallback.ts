import type { Customer } from "../types/customer.js";
import type { Product } from "../types/product.js";
import type { Sale } from "../types/sale.js";
import type { Quote } from "../types/quote.js";

function getIsoDate() {
  return new Date().toISOString();
}

const mockCustomer: Customer = {
  _id: "mock-customer-1",
  tenantId: "mock-tenant",
  name: "Cliente de Prueba (Mock)",
  email: "mock@example.com",
  phone: "+1 555 123 4567",
  identificationType: "CC",
  identificationNumber: "123456789",
  createdAt: getIsoDate(),
  updatedAt: getIsoDate(),
};

const mockProduct: Product = {
  _id: "mock-product-1",
  tenantId: "mock-tenant",
  name: "Producto de Prueba (Mock)",
  itemType: "PRODUCT",
  basePrice: 1000,
  taxRate: 19,
  unitPrice: 1190,
  currency: "COP",
  status: "ACTIVE",
  createdAt: getIsoDate(),
  updatedAt: getIsoDate(),
};

const mockQuote: Quote = {
  _id: "mock-quote-1",
  tenantId: "mock-tenant",
  customerId: mockCustomer._id,
  documentType: "QUOTE",
  number: "QT-MOCK-001",
  subtotal: 1000,
  totalDiscount: 0,
  totalTax: 190,
  total: 1190,
  currency: "COP",
  status: "DRAFT",
  items: [
    {
      productId: mockProduct._id,
      name: mockProduct.name,
      quantity: 1,
      unitPrice: 1190,
      subtotal: 1190,
      taxRate: 19,
      discountPercent: 0,
      taxAmount: 190,
      totalLine: 1190
    }
  ],
  validUntil: getIsoDate(),
  createdAt: getIsoDate(),
  updatedAt: getIsoDate(),
};

const mockSale: Sale = {
  _id: "mock-sale-1",
  tenantId: "mock-tenant",
  customerId: mockCustomer._id,
  quoteId: mockQuote._id,
  number: "SL-MOCK-001",
  subtotal: 1000,
  totalDiscount: 0,
  totalTax: 190,
  total: 1190,
  currency: "COP",
  status: "CONFIRMED",
  items: [
    {
      productId: mockProduct._id,
      name: mockProduct.name,
      quantity: 1,
      unitPrice: 1190,
      subtotal: 1190,
      taxRate: 19,
      discountPercent: 0,
      taxAmount: 190,
      totalLine: 1190,
    },
  ],
  soldAt: getIsoDate(),
  createdAt: getIsoDate(),
  updatedAt: getIsoDate(),
};

function getBaseMockResponse(path: string): unknown {
  if (path.includes("/api/customers")) {
    if (path.split("/").length > 3 && !path.includes("?")) {
      return mockCustomer;
    }
    return { data: [mockCustomer], pagination: { page: 1, limit: 10, total: 1, pages: 1 } };
  }
  
  if (path.includes("/api/products")) {
    if (path.split("/").length > 3 && !path.includes("?")) {
      return mockProduct;
    }
    return { data: [mockProduct], pagination: { page: 1, limit: 10, total: 1, pages: 1 } };
  }
  
  if (path.includes("/api/sales")) {
    if (path.split("/").length > 3 && !path.includes("?")) {
      return {
        sale: mockSale,
        quote: mockQuote,
        customer: mockCustomer,
        events: [],
      };
    }
    return { data: [mockSale], pagination: { page: 1, limit: 10, total: 1, pages: 1 } };
  }
  
  if (path.includes("/api/quotes")) {
    if (path.split("/").length > 3 && !path.includes("?")) {
      return { quote: mockQuote, customer: mockCustomer };
    }
    return { data: [mockQuote], pagination: { page: 1, limit: 10, total: 1, pages: 1 } };
  }
  


  
  if (path.includes("/api/agent/config")) {
    return {
      _id: "mock-agent-config",
      tenantId: "mock-tenant",
      name: "Mock Agent",
      language: "es",
      tone: "PROFESSIONAL",
      status: "ACTIVE",
      productScope: "ALL",
      allowedProductIds: [],
      enabledTools: ["PRODUCT_SEARCH"],
      behaviorRules: [],
      escalation: { enabled: false, keywords: [] },
      memory: { enabled: true, messageWindow: 10, maxContextTokens: 4000, summarizationEnabled: false },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  if (path.includes("/api/tenant/dashboard/summary")) {
    return {
      quotes: { total: 15, sent: 10, accepted: 5 },
      sales: { total: 10, amount: 5000 },
      customers: { total: 20 },
      products: { total: 50 },
      agents: { total: 2 },
      conversionRate: 33.3
    };
  }

  if (path.includes("/api/super-admin/dashboard/summary")) {
    return {
      tenants: { total: 5, active: 4 },
      users: { total: 20 },
      sales: { total: 100, amount: 50000 },
      quotes: { total: 150 }
    };
  }

  if (path.includes("/api/agent/dashboard/summary")) {
    return {
      quotes: { total: 15, pending: 10, accepted: 5 },
      sales: { total: 10, amount: 5000 },
      customers: { total: 20 },
      conversionRate: 33.3
    };
  }

  // Generic fallback for objects

  if (path.split("/").length > 3 && !path.includes("?")) {
     return { _id: "mock-id", name: "Mock Document" };
  }
  // Generic fallback for lists
  return { data: [], pagination: { page: 1, limit: 10, total: 0, pages: 1 } };
}

export function getMockResponse(path: string): unknown {
  if (path.includes("/api/auth/login")) {
    return {
      token: "mock-token",
      user: {
        _id: "mock-user",
        tenantId: "mock-tenant",
        email: "mock@example.com",
        firstName: "Mock",
        lastName: "User",
        role: "TENANT_ADMIN"
      }
    };
  }
  if (path.includes("/api/tenants/me")) {
    return {
      _id: "mock-tenant",
      name: "Mock Tenant",
      status: "ACTIVE"
    };
  }
  
  return getBaseMockResponse(path);
}
