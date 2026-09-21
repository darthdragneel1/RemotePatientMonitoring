export type Role = "ORG_USER" | "ORG_ADMIN" | "SUPER_ADMIN";

export interface User {
  id: string;
  email: string;
  role: Role;
  orgId: string | null;
  org?: { id: string; name: string } | null;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  createdAt: string;
}

export interface VitalThreshold {
  redLow?: number;
  orangeLow?: number;
  orangeHigh?: number;
  redHigh?: number;
}

export type VitalMetricKey = "sys" | "dia" | "pulse" | "spo2" | "glucose" | "weight";

export type VitalThresholds = Partial<Record<VitalMetricKey, VitalThreshold>>;

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  gender: string | null;
  mrn: string | null;
  phone: string | null;
  notes: string | null;
  vitalThresholds: VitalThresholds | null;
  orgId: string;
  createdAt: string;
}

export interface Device {
  id: string;
  deviceId: string;
  modelNumber: string | null;
  imei: string | null;
  sn: string | null;
  orgId: string;
  patientId: string | null;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    vitalThresholds: VitalThresholds | null;
  } | null;
  org?: { id: string; name: string };
  createdAt: string;
}

export type TelemetryKind = "TELEMETRY" | "STATUS" | "HEARTBEAT";

export interface TelemetryEvent {
  id: string;
  kind: TelemetryKind;
  payload: Record<string, unknown>;
  recordedAt: string;
  createdAt: string;
  deviceId: string;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  userEmail: string | null;
  orgId: string | null;
  action: string;
  target: string | null;
  targetId: string | null;
  details: any | null;
  createdAt: string;
}
