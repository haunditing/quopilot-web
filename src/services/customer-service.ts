import { apiRequest } from "../lib/api.js";
import type {
  Customer,
  CustomerListResponse,
  CustomerType,
  IdentificationType,
} from "../types/customer.js";

export interface GetCustomersParams {
  page?: number;
  limit?: number;
  search?: string;
  country?: string;
}

export interface CreateCustomerInput {
  name: string;
  customerType?: CustomerType;
  firstName?: string;
  lastName?: string;
  identificationType?: IdentificationType;
  identificationNumber?: string;
  municipality?: string;
  department?: string;
  address?: string;
  postalCode?: string;
  email?: string;
  email2?: string;
  phone?: string;
  phone2?: string;
  sendStatement?: boolean;
  whatsappId?: string;
  country?: string;
}

export interface UpdateCustomerInput {
  name?: string;
  customerType?: CustomerType;
  firstName?: string;
  lastName?: string;
  identificationType?: IdentificationType;
  identificationNumber?: string;
  municipality?: string;
  department?: string;
  address?: string;
  postalCode?: string;
  email?: string;
  email2?: string;
  phone?: string;
  phone2?: string;
  sendStatement?: boolean;
  whatsappId?: string;
  country?: string;
}

export async function getCustomer(customerId: string): Promise<Customer> {
  return apiRequest<Customer>(`/api/customers/${customerId}`, {
    method: "GET",
  });
}

export async function getCustomers({
  page = 1,
  limit = 20,
  search,
  country,
}: GetCustomersParams = {}): Promise<CustomerListResponse> {
  const params = new URLSearchParams();

  params.set("page", String(page));
  params.set("limit", String(limit));

  if (search) {
    params.set("search", search);
  }

  if (country) {
    params.set("country", country);
  }

  return apiRequest<CustomerListResponse>(
    `/api/customers?${params.toString()}`,
    {
      method: "GET",
    },
  );
}

export async function createCustomer(
  input: CreateCustomerInput,
): Promise<Customer> {
  return apiRequest<Customer>("/api/customers", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateCustomer(
  customerId: string,
  input: UpdateCustomerInput,
): Promise<Customer> {
  return apiRequest<Customer>(`/api/customers/${customerId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteCustomer(customerId: string): Promise<void> {
  return apiRequest<void>(`/api/customers/${customerId}`, {
    method: "DELETE",
  });
}
