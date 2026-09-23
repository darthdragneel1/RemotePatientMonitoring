import { useEffect } from "react";
import { toast } from "sonner";
import { getTelemetryColumns, getTelemetryData, getVitalStatus, getThresholdFor } from "@/lib/telemetryDisplay";

export function useLiveTelemetry() {
  useEffect(() => {
    const url = `${import.meta.env.VITE_API_URL || ""}/api/live/telemetry`;
    const eventSource = new EventSource(url, { withCredentials: true });
    
    eventSource.onmessage = (messageEvent) => {
      try {
        const data = JSON.parse(messageEvent.data);
        const { event: telemetry, device } = data;
        
        if (!device || !telemetry || telemetry.kind !== "TELEMETRY") return;
        
        const columns = getTelemetryColumns(device.modelNumber, telemetry.payload);
        const rowData = getTelemetryData(telemetry.payload);
        const thresholds = device.patient?.vitalThresholds;
        
        let isAbnormal = false;
        let abnormalDetails = "";
        
        for (const col of columns) {
          if (col.metricKey) {
            const status = getVitalStatus(getThresholdFor(thresholds, col.metricKey), col.getNumeric?.(rowData));
            if (status === "red" || status === "orange") {
              isAbnormal = true;
              abnormalDetails += `${col.label}: ${col.get(rowData)}\n`;
            }
          }
        }
        
        if (isAbnormal) {
          const title = `Abnormal reading for ${device.patient ? `${device.patient.firstName} ${device.patient.lastName}` : `Device ${device.deviceId}`}`;
          const body = abnormalDetails.trim();
          
          toast.error(title, {
            description: body,
            duration: 10000,
          });
          
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(title, {
              body,
              icon: "/favicon.ico"
            });
          }
        }
      } catch (err) {
        console.error("Error parsing live telemetry", err);
      }
    };
    
    eventSource.onerror = (err) => {
      console.error("SSE connection error", err);
    };
    
    return () => eventSource.close();
  }, []);
}
