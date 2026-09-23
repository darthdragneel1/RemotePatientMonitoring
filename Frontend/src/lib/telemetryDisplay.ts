// Field specs per the MioConnect "Integration Tutorial for Fully Managed
// Devices" doc, section 4.1 (Telemetry Data Specification). Payload shape
// stored in TelemetryEvent.payload is the raw forwarded body, so the
// device-specific fields live under `payload.data`.

import type { VitalMetricKey, VitalThreshold, VitalThresholds } from "./types";

type TelemetryData = Record<string, unknown>;

interface TelemetryColumn {
  label: string;
  get: (data: TelemetryData) => string;
  /** Present only for columns that support alert-threshold coloring. */
  metricKey?: VitalMetricKey;
  /**
   * Numeric value in the same canonical unit the threshold is defined in
   * (kg for weight, mg/dL for glucose, mmHg/bpm/% as displayed for the
   * rest) — independent of `get`'s display formatting/unit conversion.
   */
  getNumeric?: (data: TelemetryData) => number | undefined;
}

function num(data: TelemetryData, key: string): number | undefined {
  const value = data[key];
  return typeof value === "number" ? value : undefined;
}

// removed bool function

// mmol/L -> mg/dL, the standard clinical conversion factor.
const MMOL_TO_MGDL = 18.0182;

const BPM_GEN2_COLUMNS: TelemetryColumn[] = [
  {
    label: "Timestamp",
    get: (d) => {
      const ts = num(d, "ts");
      return ts ? new Date(ts * 1000).toLocaleString() : "—";
    },
  },
  {
    label: "Timezone",
    get: (d) => {
      const tz = d.tz;
      return typeof tz === "string" ? tz : "—";
    },
  },
  {
    label: "Battery",
    get: (d) => {
      const bat = num(d, "bat");
      return bat !== undefined ? `${bat}%` : "—";
    },
  },
  {
    label: "Systolic",
    get: (d) => (num(d, "sys") !== undefined ? `${num(d, "sys")} mmHg` : "—"),
    metricKey: "sys",
    getNumeric: (d) => num(d, "sys"),
  },
  {
    label: "Diastolic",
    get: (d) => (num(d, "dia") !== undefined ? `${num(d, "dia")} mmHg` : "—"),
    metricKey: "dia",
    getNumeric: (d) => num(d, "dia"),
  },
  {
    label: "Pulse",
    get: (d) => (num(d, "pul") !== undefined ? `${num(d, "pul")} bpm` : "—"),
    metricKey: "pulse",
    getNumeric: (d) => num(d, "pul"),
  },
];

const WEIGHT_SCALE_COLUMNS: TelemetryColumn[] = [
  {
    label: "Weight",
    get: (d) => {
      const wt = num(d, "wt");
      return wt !== undefined ? `${(wt / 1000).toFixed(1)} kg` : "—";
    },
    metricKey: "weight",
    getNumeric: (d) => {
      const wt = num(d, "wt");
      return wt !== undefined ? wt / 1000 : undefined;
    },
  },
];

const GLUCOSE_METER_COLUMNS: TelemetryColumn[] = [
  {
    label: "Blood Glucose",
    get: (d) => {
      const value = num(d, "data");
      if (value === undefined) return "—";
      const unit = num(d, "unit");
      const unitLabel = unit === 1 ? "mmol/L" : unit === 2 ? "mg/dL" : "";
      return `${value} ${unitLabel}`.trim();
    },
    metricKey: "glucose",
    // Thresholds are always defined in mg/dL; convert mmol/L readings so
    // patients get consistent coloring regardless of the device's unit.
    getNumeric: (d) => {
      const value = num(d, "data");
      if (value === undefined) return undefined;
      const unit = num(d, "unit");
      if (unit === 1) return value * MMOL_TO_MGDL;
      if (unit === 2) return value;
      return undefined;
    },
  },
  {
    label: "Meal",
    get: (d) => {
      const meal = num(d, "meal");
      if (meal === 1) return "Before meal";
      if (meal === 2) return "After meal";
      if (meal === 0) return "Not selected";
      return "—";
    },
  },
];

const PULSE_OXIMETER_COLUMNS: TelemetryColumn[] = [
  {
    label: "Blood Oxygen (SpO2)",
    get: (d) => {
      const spo2 = num(d, "spo2");
      return spo2 !== undefined && spo2 !== 127 ? `${spo2}%` : "—";
    },
    metricKey: "spo2",
    getNumeric: (d) => {
      const spo2 = num(d, "spo2");
      return spo2 !== undefined && spo2 !== 127 ? spo2 : undefined;
    },
  },
  {
    label: "Perfusion Index",
    get: (d) => {
      const pi = num(d, "pi");
      return pi !== undefined && pi !== 0 ? `${(pi / 10).toFixed(1)}%` : "—";
    },
  },
  {
    label: "Pulse Rate",
    get: (d) => {
      const pr = num(d, "pr");
      return pr !== undefined && pr !== 255 ? `${pr} bpm` : "—";
    },
    metricKey: "pulse",
    getNumeric: (d) => {
      const pr = num(d, "pr");
      return pr !== undefined && pr !== 255 ? pr : undefined;
    },
  },
];

const COLUMNS_BY_MODEL: Record<string, TelemetryColumn[]> = {
  "TMB-2092-G": BPM_GEN2_COLUMNS, // Sphygmomanometer (Transtek BPM Gen2)
  "GBS-2104-G": WEIGHT_SCALE_COLUMNS, // Weight Scale (Transtek Scale Gen2)
  "TMB-2282-G": GLUCOSE_METER_COLUMNS, // Blood Glucose Meter (Transtek BGM Gen1)
  BM1000: PULSE_OXIMETER_COLUMNS, // Pulse Oximeter (Transtek Gen1)
};

const FALLBACK_COLUMN: TelemetryColumn = {
  label: "Payload",
  get: (d) => JSON.stringify(d),
};

export function getTelemetryColumns(modelNumber: string | null | undefined, firstPayload?: unknown): TelemetryColumn[] {
  const data = getTelemetryData(firstPayload);
  if (data.data_type === "bpm_gen2_measure") {
    return BPM_GEN2_COLUMNS;
  }
  
  if (modelNumber && COLUMNS_BY_MODEL[modelNumber]) {
    return COLUMNS_BY_MODEL[modelNumber];
  }
  return [FALLBACK_COLUMN];
}

export function getTelemetryData(payload: unknown): TelemetryData {
  if (payload && typeof payload === "object" && "data" in payload) {
    const data = (payload as { data: unknown }).data;
    if (data && typeof data === "object") {
      return data as TelemetryData;
    }
  }
  return {};
}

export type VitalStatus = "green" | "orange" | "red";

/**
 * Bands: below redLow or above redHigh = red; below orangeLow or above
 * orangeHigh = orange; otherwise green. Any boundary left unset is treated
 * as unbounded on that side (e.g. omit redHigh for a vital where only low
 * readings are dangerous). Returns null if no threshold is configured at
 * all for this metric, or the value is missing — callers should render
 * plainly in that case rather than implying "normal".
 */
export function getVitalStatus(
  threshold: VitalThreshold | null | undefined,
  value: number | undefined
): VitalStatus | null {
  if (!threshold || value === undefined) return null;

  const { redLow, orangeLow, orangeHigh, redHigh } = threshold;
  const hasAnyBound =
    redLow !== undefined || orangeLow !== undefined || orangeHigh !== undefined || redHigh !== undefined;
  if (!hasAnyBound) return null;

  if (redLow !== undefined && value < redLow) return "red";
  if (redHigh !== undefined && value > redHigh) return "red";
  if (orangeLow !== undefined && value < orangeLow) return "orange";
  if (orangeHigh !== undefined && value > orangeHigh) return "orange";
  return "green";
}

export function getVitalAbnormalityDirection(
  threshold: VitalThreshold | null | undefined,
  value: number | undefined
): "High" | "Low" | null {
  if (!threshold || value === undefined) return null;
  const { redLow, orangeLow, orangeHigh, redHigh } = threshold;
  
  if (redHigh !== undefined && value > redHigh) return "High";
  if (orangeHigh !== undefined && value > orangeHigh) return "High";
  if (redLow !== undefined && value < redLow) return "Low";
  if (orangeLow !== undefined && value < orangeLow) return "Low";
  return null;
}

export const DEFAULT_THRESHOLDS: VitalThresholds = {
  sys: { orangeHigh: 130, redHigh: 140, orangeLow: 90, redLow: 80 },
  dia: { orangeHigh: 85, redHigh: 90, orangeLow: 60, redLow: 50 },
  pulse: { orangeHigh: 100, redHigh: 120, orangeLow: 50, redLow: 40 },
  spo2: { orangeLow: 95, redLow: 90 },
};

export function getThresholdFor(
  thresholds: VitalThresholds | null | undefined,
  metricKey: VitalMetricKey | undefined
): VitalThreshold | undefined {
  if (!metricKey) return undefined;
  
  const defaultThresh = DEFAULT_THRESHOLDS[metricKey];
  const customThresh = thresholds?.[metricKey];
  
  if (!defaultThresh && !customThresh) return undefined;
  
  return {
    ...defaultThresh,
    ...customThresh
  };
}

export const VITAL_STATUS_CLASS: Record<VitalStatus, string> = {
  green: "text-emerald-600 font-medium",
  orange: "text-amber-600 font-medium",
  red: "text-red-600 font-semibold",
};
