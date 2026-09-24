export interface VitalThreshold {
  redLow?: number;
  orangeLow?: number;
  orangeHigh?: number;
  redHigh?: number;
}

export type VitalThresholds = Record<string, VitalThreshold>;

export const DEFAULT_THRESHOLDS: VitalThresholds = {
  sys: { orangeHigh: 130, redHigh: 140, orangeLow: 90, redLow: 80 },
  dia: { orangeHigh: 85, redHigh: 90, orangeLow: 60, redLow: 50 },
  pulse: { orangeHigh: 100, redHigh: 120, orangeLow: 50, redLow: 40 },
  spo2: { orangeLow: 95, redLow: 90 },
  glucose: { redLow: 70, orangeLow: 80, orangeHigh: 130, redHigh: 180 },
  weight: {},
};

export function getThresholdFor(thresholds: any, metricKey: string): VitalThreshold | undefined {
  const defaultThresh = DEFAULT_THRESHOLDS[metricKey];
  const customThresh = thresholds?.[metricKey];
  
  if (customThresh && Object.keys(customThresh).length > 0) {
    return customThresh;
  }
  return defaultThresh;
}

export function getTelemetryAbnormalities(rawPayload: any, thresholds: any): string[] {
  const abnormalities: string[] = [];
  
  let payload = rawPayload;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {}
  }

  // Handle case where payload.data might be a stringified JSON
  let innerData = payload?.data;
  if (typeof innerData === "string") {
    try {
      innerData = JSON.parse(innerData);
    } catch {}
  }

  // MioConnect payloads store device data under payload.data
  const data =
    innerData && typeof innerData === "object"
      ? { ...payload, ...innerData }
      : payload || {};

  const checkMetric = (key: string, value: number | undefined, label: string, unit: string = "") => {
    if (value === undefined || value === null || isNaN(value)) return;
    const threshold = getThresholdFor(thresholds, key);
    if (!threshold) return;

    const unitStr = unit ? ` ${unit}` : "";
    if (threshold.redLow !== undefined && value < threshold.redLow) {
      abnormalities.push(`${label}: ${value}${unitStr} (Critically Low)`);
    } else if (threshold.redHigh !== undefined && value > threshold.redHigh) {
      abnormalities.push(`${label}: ${value}${unitStr} (Critically High)`);
    } else if (threshold.orangeLow !== undefined && value < threshold.orangeLow) {
      abnormalities.push(`${label}: ${value}${unitStr} (Low)`);
    } else if (threshold.orangeHigh !== undefined && value > threshold.orangeHigh) {
      abnormalities.push(`${label}: ${value}${unitStr} (High)`);
    }
  };

  // Systolic
  const sys =
    data.sys !== undefined
      ? Number(data.sys)
      : data.systolic !== undefined
      ? Number(data.systolic)
      : undefined;
  if (sys !== undefined) checkMetric("sys", sys, "Systolic", "mmHg");

  // Diastolic
  const dia =
    data.dia !== undefined
      ? Number(data.dia)
      : data.diastolic !== undefined
      ? Number(data.diastolic)
      : undefined;
  if (dia !== undefined) checkMetric("dia", dia, "Diastolic", "mmHg");

  // Pulse / Heart Rate
  let pulse: number | undefined;
  if (data.pul !== undefined) {
    pulse = Number(data.pul);
  } else if (data.pr !== undefined && Number(data.pr) !== 255) {
    pulse = Number(data.pr);
  } else if (data.pulse !== undefined) {
    pulse = Number(data.pulse);
  } else if (data.heartRate !== undefined) {
    pulse = Number(data.heartRate);
  }
  if (pulse !== undefined) checkMetric("pulse", pulse, "Pulse", "bpm");

  // SpO2 (127 means sensor probe off or invalid)
  const spo2 =
    data.spo2 !== undefined && Number(data.spo2) !== 127 ? Number(data.spo2) : undefined;
  if (spo2 !== undefined) checkMetric("spo2", spo2, "SpO2", "%");

  // Glucose
  const glucose =
    data.data !== undefined
      ? Number(data.data)
      : data.bloodGlucose !== undefined
      ? Number(data.bloodGlucose)
      : data.glucose !== undefined
      ? Number(data.glucose)
      : undefined;
  if (glucose !== undefined) checkMetric("glucose", glucose, "Glucose", "mg/dL");

  // Weight (grams to kg if > 500)
  let weight: number | undefined;
  if (data.wt !== undefined) {
    const rawWt = Number(data.wt);
    weight = rawWt > 500 ? rawWt / 1000 : rawWt;
  } else if (data.weight !== undefined) {
    weight = Number(data.weight);
  }
  if (weight !== undefined) checkMetric("weight", Number(weight.toFixed(1)), "Weight", "kg");

  return abnormalities;
}
