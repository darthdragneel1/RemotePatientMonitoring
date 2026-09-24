export interface VitalThreshold {
  redLow?: number;
  orangeLow?: number;
  orangeHigh?: number;
  redHigh?: number;
}

export type VitalThresholds = Record<string, VitalThreshold>;

export const DEFAULT_THRESHOLDS: VitalThresholds = {
  sys: { redLow: 90, orangeLow: 100, orangeHigh: 130, redHigh: 140 },
  dia: { redLow: 60, orangeLow: 65, orangeHigh: 80, redHigh: 90 },
  pulse: { redLow: 50, orangeLow: 60, orangeHigh: 100, redHigh: 120 },
  spo2: { redLow: 90, orangeLow: 94 },
  glucose: { redLow: 70, orangeLow: 80, orangeHigh: 130, redHigh: 180 },
  weight: {}, 
};

function getThresholdFor(thresholds: any, metricKey: string): VitalThreshold | undefined {
  const defaultThresh = DEFAULT_THRESHOLDS[metricKey];
  const customThresh = thresholds?.[metricKey];
  
  if (customThresh && Object.keys(customThresh).length > 0) {
    return customThresh;
  }
  return defaultThresh;
}

export function getTelemetryAbnormalities(payload: any, thresholds: any): string[] {
  const abnormalities: string[] = [];
  
  const checkMetric = (key: string, value: number | undefined, label: string) => {
    if (value === undefined || isNaN(value)) return;
    const threshold = getThresholdFor(thresholds, key);
    if (!threshold) return;

    if (threshold.redLow !== undefined && value <= threshold.redLow) {
      abnormalities.push(`${label}: ${value} (Critically Low)`);
    } else if (threshold.redHigh !== undefined && value >= threshold.redHigh) {
      abnormalities.push(`${label}: ${value} (Critically High)`);
    } else if (threshold.orangeLow !== undefined && value <= threshold.orangeLow) {
      abnormalities.push(`${label}: ${value} (Low)`);
    } else if (threshold.orangeHigh !== undefined && value >= threshold.orangeHigh) {
      abnormalities.push(`${label}: ${value} (High)`);
    }
  };

  if (payload.systolic !== undefined) checkMetric("sys", Number(payload.systolic), "Systolic");
  if (payload.diastolic !== undefined) checkMetric("dia", Number(payload.diastolic), "Diastolic");
  if (payload.heartRate !== undefined) checkMetric("pulse", Number(payload.heartRate), "Heart Rate");
  if (payload.spo2 !== undefined) checkMetric("spo2", Number(payload.spo2), "SpO2");
  if (payload.bloodGlucose !== undefined) checkMetric("glucose", Number(payload.bloodGlucose), "Glucose");
  if (payload.weight !== undefined) checkMetric("weight", Number(payload.weight), "Weight");

  return abnormalities;
}
