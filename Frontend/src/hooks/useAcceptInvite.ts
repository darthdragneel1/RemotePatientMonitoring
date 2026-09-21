import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";

export function useInvitePreview(token: string | null) {
  return useQuery({
    queryKey: ["invite-preview", token],
    queryFn: () =>
      api
        .get<{ invite: { email: string; org: { id: string; name: string } } }>(`/invites/${token}`)
        .then((r) => r.invite),
    enabled: !!token,
    retry: false,
  });
}

export function useAcceptInvite(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (password: string) => api.post<{ user: User }>(`/invites/${token}/accept`, { password }),
    onSuccess: (res) => queryClient.setQueryData(["me"], res.user),
  });
}
