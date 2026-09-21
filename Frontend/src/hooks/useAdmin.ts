import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Organization, Role } from "@/lib/types";

export interface Invite {
  id: string;
  email: string;
  orgId: string;
  role: Role;
  expiresAt: string;
  org?: { id: string; name: string };
}

export function useOrganizations() {
  return useQuery({
    queryKey: ["organizations"],
    queryFn: () => api.get<{ organizations: Organization[] }>("/admin/organizations").then((r) => r.organizations),
  });
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) => api.post<{ organization: Organization }>("/admin/organizations", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["organizations"] }),
  });
}

export function useInvites() {
  return useQuery({
    queryKey: ["invites"],
    queryFn: () => api.get<{ invites: Invite[] }>("/admin/invites").then((r) => r.invites),
  });
}

export function useCreateInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; orgId: string; role?: Role }) =>
      api.post<{ invite: Invite }>("/admin/invites", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invites"] }),
  });
}

export function useRevokeInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/invites/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invites"] }),
  });
}
