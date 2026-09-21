import type { VitalMetricKey } from "./types";

export const VITAL_METRICS: { key: VitalMetricKey; label: string; unit: string }[] = [
  { key: "sys", label: "Systolic", unit: "mmHg" },
  { key: "dia", label: "Diastolic", unit: "mmHg" },
  { key: "pulse", label: "Pulse", unit: "bpm" },
  { key: "spo2", label: "SpO2", unit: "%" },
  { key: "glucose", label: "Blood Glucose", unit: "mg/dL" },
  { key: "weight", label: "Weight", unit: "kg" },
];
