import { apiRequest } from "../lib/api.js";
import type {
  Channel,
  ChannelConfig,
  ChannelCredentialsInput,
  ChannelListResponse,
  ChannelStatus,
  ChannelType,
} from "../types/channel.js";

export interface GetChannelsParams {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
}

export interface CreateChannelInput {
  type: ChannelType;
  name: string;
  config: ChannelConfig;
  credentials?: ChannelCredentialsInput;
}

export interface UpdateChannelInput {
  name?: string;
  config?: ChannelConfig;
  credentials?: ChannelCredentialsInput;
}

export async function getChannels({
  page = 1,
  limit = 20,
  type,
  status,
}: GetChannelsParams = {}): Promise<ChannelListResponse> {
  const params = new URLSearchParams();

  params.set("page", String(page));
  params.set("limit", String(limit));

  if (type) {
    params.set("type", type);
  }

  if (status) {
    params.set("status", status);
  }

  return apiRequest<ChannelListResponse>(`/api/channels?${params.toString()}`, {
    method: "GET",
  });
}

export async function getChannel(channelId: string): Promise<Channel> {
  return apiRequest<Channel>(`/api/channels/${channelId}`, {
    method: "GET",
  });
}

export async function createChannel(
  input: CreateChannelInput,
): Promise<Channel> {
  return apiRequest<Channel>("/api/channels", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateChannel(
  channelId: string,
  input: UpdateChannelInput,
): Promise<Channel> {
  return apiRequest<Channel>(`/api/channels/${channelId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function updateChannelStatus(
  channelId: string,
  status: ChannelStatus,
): Promise<Channel> {
  return apiRequest<Channel>(`/api/channels/${channelId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function deleteChannel(channelId: string): Promise<void> {
  return apiRequest<void>(`/api/channels/${channelId}`, {
    method: "DELETE",
  });
}
