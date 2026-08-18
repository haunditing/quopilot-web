import { apiRequest } from "../lib/api.js";
import type { User, UserListResponse, UserStatus } from "../types/user.js";

export interface GetUsersParams {
  page?: number;
  limit?: number;
  status?: UserStatus;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function getUsers({
  page = 1,
  limit = 20,
  status,
  search,
  dateFrom,
  dateTo,
}: GetUsersParams = {}): Promise<UserListResponse> {
  const params = new URLSearchParams();

  params.set("page", String(page));
  params.set("limit", String(limit));

  if (status) {
    params.set("status", status);
  }

  if (search) {
    params.set("search", search);
  }

  if (dateFrom) {
    params.set("dateFrom", dateFrom);
  }

  if (dateTo) {
    params.set("dateTo", dateTo);
  }

  return apiRequest<UserListResponse>(`/api/users?${params.toString()}`);
}

export async function getUser(userId: string): Promise<User> {
  return apiRequest<User>(`/api/users/${userId}`, {
    method: "GET",
  });
}

export interface CreateAgentInput {
  name: string;
  email: string;
  password: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
}

export async function createAgent(input: CreateAgentInput): Promise<User> {
  return apiRequest<User>("/api/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateUser(
  userId: string,
  input: UpdateUserInput,
): Promise<User> {
  return apiRequest<User>(`/api/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function updateUserStatus(
  userId: string,
  status: UserStatus,
): Promise<User> {
  return apiRequest<User>(`/api/users/${userId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function deleteUser(userId: string): Promise<void> {
  return apiRequest<void>(`/api/users/${userId}`, {
    method: "DELETE",
  });
}
