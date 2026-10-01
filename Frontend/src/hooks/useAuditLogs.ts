import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AuditLog } from "@/lib/types";

export interface AuditLogPage {
  logs: AuditLog[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AuditLogFilters {
  from?: string;
  to?: string;
  orgId?: string;
}

export function useAuditLogs(page = 1, limit = 50, filters: AuditLogFilters = {}) {
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (filters.from) queryParams.set("from", filters.from);
  if (filters.to) queryParams.set("to", filters.to);
  if (filters.orgId) queryParams.set("orgId", filters.orgId);

  return useQuery({
    queryKey: ["auditLogs", page, limit, filters],
    queryFn: () => api.get<AuditLogPage>(`/audit?${queryParams.toString()}`),
    placeholderData: (previousData) => previousData,
  });
}

export async function downloadAuditLogsTsv(filters: AuditLogFilters = {}) {
  const queryParams = new URLSearchParams();
  if (filters.from) queryParams.set("from", filters.from);
  if (filters.to) queryParams.set("to", filters.to);
  if (filters.orgId) queryParams.set("orgId", filters.orgId);

  const url = `/audit/export?${queryParams.toString()}`;
  const API_URL = import.meta.env.VITE_API_URL || "";
  const response = await fetch(`${API_URL}/api${url}`, { credentials: "include" });
  
  if (!response.ok) {
    throw new Error("Failed to download audit logs");
  }
  
  const text = await response.text();
  const blob = new Blob([text], { type: 'text/tab-separated-values' });
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = "audit-logs.tsv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
}
