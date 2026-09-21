import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Patient, Device, VitalThresholds } from "@/lib/types";

export interface PatientInput {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: string;
  mrn?: string;
  phone?: string;
  notes?: string;
  vitalThresholds?: VitalThresholds;
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

export function useUpdatePatient(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<PatientInput>) => api.patch<{ patient: Patient }>(`/patients/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["patients", id] });
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
