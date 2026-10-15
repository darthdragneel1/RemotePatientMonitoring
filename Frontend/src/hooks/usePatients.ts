import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Patient, Device, VitalThresholds, TelemetryEvent, TelemetryKind } from "@/lib/types";

export interface PatientInput {
  firstName: string;
  lastName: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  mrn?: string | null;
  phone?: string | null;
  notes?: string | null;
  vitalThresholds?: VitalThresholds | null;
  orgId?: string;
}

export function usePatients() {
  return useQuery({
    queryKey: ["patients"],
    queryFn: () => api.get<{ patients: Patient[] }>("/patients").then((r) => r.patients),
  });
}

export interface PatientWithDevices extends Patient {
  devices: Device[];
}

export function usePatient(id: string | undefined) {
  return useQuery({
    queryKey: ["patients", id],
    queryFn: () => api.get<{ patient: PatientWithDevices }>(`/patients/${id}`).then((r) => r.patient),
    enabled: !!id,
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PatientInput) => api.post<{ patient: Patient }>("/patients", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["patients"] }),
  });
}

export function useUpdatePatient(id?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<PatientInput> & { patientId?: string }) => {
      const targetId = data.patientId || id;
      if (!targetId) throw new Error("Patient ID is required");
      const { patientId: _, ...rest } = data;
      return api.patch<{ patient: Patient }>(`/patients/${targetId}`, rest);
    },
    onSuccess: (_, variables) => {
      const targetId = variables?.patientId || id;
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      if (targetId) {
        queryClient.invalidateQueries({ queryKey: ["patients", targetId] });
      }
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}

export function useDeletePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/patients/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["patients"] }),
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

export function usePatientTelemetry(id: string | undefined, filters: TelemetryFilters = {}) {
  const { kind, from, to, page = 1, limit = 25 } = filters;
  return useQuery({
    queryKey: ["patients", id, "telemetry", { kind, from, to, page, limit }],
    queryFn: () =>
      api.get<TelemetryPage>(`/patients/${id}/telemetry${toQueryString({ kind, from, to, page, limit })}`),
    enabled: !!id,
    placeholderData: (previousData) => previousData,
  });
}

export function useUpdatePatientTelemetryCommunication(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, communication }: { eventId: string; communication: string | null }) =>
      api.patch<{ event: TelemetryEvent }>(`/patients/${patientId}/telemetry/${eventId}/communication`, {
        communication,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients", patientId, "telemetry"] });
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}

export function fetchPatientTelemetryExport(
  id: string,
  filters: Pick<TelemetryFilters, "kind" | "from" | "to"> = {}
) {
  return api
    .get<{ events: TelemetryEvent[] }>(`/patients/${id}/telemetry/export${toQueryString(filters)}`)
    .then((r) => r.events);
}

export function usePatientTelemetryLatest(id: string | undefined) {
  return useQuery({
    queryKey: ["patients", id, "telemetry", "latest"],
    queryFn: () =>
      api
        .get<{ latest: Record<TelemetryKind, TelemetryEvent | null> }>(`/patients/${id}/telemetry/latest`)
        .then((r) => r.latest),
    enabled: !!id,
  });
}
