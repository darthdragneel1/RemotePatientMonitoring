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
