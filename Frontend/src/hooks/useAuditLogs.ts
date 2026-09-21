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

export function useAuditLogs(page = 1, limit = 50) {
  return useQuery({
    queryKey: ["auditLogs", page, limit],
    queryFn: () => api.get<AuditLogPage>(`/audit?page=${page}&limit=${limit}`),
    placeholderData: (previousData) => previousData,
  });
}
