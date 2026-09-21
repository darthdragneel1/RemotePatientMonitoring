import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Device, TelemetryEvent, TelemetryKind } from "@/lib/types";

export interface DeviceInput {
  deviceId: string;
  modelNumber?: string;
  imei?: string;
  sn?: string;
  patientId?: string;
  orgId?: string;
}

export function useDevices() {
  return useQuery({
    queryKey: ["devices"],
    queryFn: () => api.get<{ devices: Device[] }>("/devices").then((r) => r.devices),
  });
}

export function useDevice(id: string | undefined) {
  return useQuery({
    queryKey: ["devices", id],
    queryFn: () => api.get<{ device: Device }>(`/devices/${id}`).then((r) => r.device),
    enabled: !!id,
  });
}

export function useCreateDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: DeviceInput) => api.post<{ device: Device }>("/devices", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["devices"] }),
  });
}

export interface DeviceUpdateInput extends Partial<Omit<DeviceInput, "patientId" | "deviceId" | "orgId">> {
  patientId?: string | null;
}

export function useUpdateDevice(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: DeviceUpdateInput) => api.patch<{ device: Device }>(`/devices/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      queryClient.invalidateQueries({ queryKey: ["devices", id] });
    },
  });
}



export interface TelemetryFilters {
  kind?: TelemetryKind;
  from?: string; // ISO datetime
  to?: string; // ISO datetime
  page?: number;
  limit?: number;
}

export interface TelemetryPage {
  events: TelemetryEvent[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function toQueryString(filters: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function useDeviceTelemetry(id: string | undefined, filters: TelemetryFilters = {}) {
  const { kind, from, to, page = 1, limit = 25 } = filters;
  return useQuery({
    queryKey: ["devices", id, "telemetry", { kind, from, to, page, limit }],
    queryFn: () =>
      api.get<TelemetryPage>(`/devices/${id}/telemetry${toQueryString({ kind, from, to, page, limit })}`),
    enabled: !!id,
    placeholderData: (previousData) => previousData,
  });
}

export function fetchDeviceTelemetryExport(
  id: string,
  filters: Pick<TelemetryFilters, "kind" | "from" | "to"> = {}
) {
  return api
    .get<{ events: TelemetryEvent[] }>(`/devices/${id}/telemetry/export${toQueryString(filters)}`)
    .then((r) => r.events);
}

export function useDeviceTelemetryLatest(id: string | undefined) {
  return useQuery({
    queryKey: ["devices", id, "telemetry", "latest"],
    queryFn: () =>
      api
        .get<{ latest: Record<TelemetryKind, TelemetryEvent | null> }>(`/devices/${id}/telemetry/latest`)
        .then((r) => r.latest),
    enabled: !!id,
  });
}
