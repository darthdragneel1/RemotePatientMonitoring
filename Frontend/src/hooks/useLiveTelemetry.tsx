import { useEffect } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { getTelemetryColumns, getTelemetryData, getVitalStatus, getThresholdFor, getVitalAbnormalityDirection } from "@/lib/telemetryDisplay";

export function useLiveTelemetry() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const url = `${import.meta.env.VITE_API_URL || ""}/api/live/telemetry`;
    const eventSource = new EventSource(url, { withCredentials: true });
    
    eventSource.onmessage = (messageEvent) => {
      try {
        const data = JSON.parse(messageEvent.data);
        console.log("Live telemetry received:", data);
        
        const { event: telemetry, device } = data;
        
        if (!device || !telemetry) return;
        
        // Dynamically update UI tables by invalidating caches
        queryClient.invalidateQueries({ queryKey: ["devices"] });
        queryClient.invalidateQueries({ queryKey: ["patients"] });
        queryClient.invalidateQueries({ queryKey: ["device", device.deviceId] });
        
        if (telemetry.kind !== "TELEMETRY") return;
        
        const columns = getTelemetryColumns(device.modelNumber, telemetry.payload);
        const rowData = getTelemetryData(telemetry.payload);
        const thresholds = device.patient?.vitalThresholds;
        
        let isAbnormal = false;
        
        // Use an array to store lines for better formatting
        const abnormalLines: string[] = [];
        const normalLines: string[] = [];
        
        for (const col of columns) {
          if (col.metricKey) {
            const threshold = getThresholdFor(thresholds, col.metricKey);
            const value = col.getNumeric?.(rowData);
            const status = getVitalStatus(threshold, value);
            
            if (status === "red" || status === "orange") {
              isAbnormal = true;
              const direction = getVitalAbnormalityDirection(threshold, value);
              const dirText = direction ? ` (${direction})` : "";
              abnormalLines.push(`• ${col.label}: ${col.get(rowData)}${dirText}`);
            } else if (status === "green" || status === null) {
              const val = col.get(rowData);
              if (val !== "—") normalLines.push(`• ${col.label}: ${val}`);
            }
          }
        }
        
        const deviceName = device.patient ? `${device.patient.firstName} ${device.patient.lastName}` : `Device ${device.deviceId}`;
        const dobStr = device.patient?.dateOfBirth ? new Date(device.patient.dateOfBirth).toLocaleDateString() : "N/A";
        
        if (isAbnormal) {
          const title = `Abnormal reading for ${deviceName}`;
          const bodyText = abnormalLines.join("\n");
          
          toast.error(
            <div className="flex flex-col gap-2 w-full">
              <div className="font-bold text-base text-red-900">{title}</div>
              {device.patient && <div className="text-sm font-semibold text-red-800">DOB: {dobStr}</div>}
              <div className="text-sm text-red-800 whitespace-pre-wrap">{bodyText}</div>
            </div>,
            {
              style: { backgroundColor: '#fee2e2', borderColor: '#f87171' },
              duration: 10000,
            }
          );
          
          const audio = new Audio("/alert.mp3");
          audio.play().catch(e => console.log("Audio blocked:", e));
          
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(title, { body: bodyText, icon: "/favicon.ico" });
          }
        } else {
          // It's a normal reading or unassigned device.
          const title = `New reading for ${deviceName}`;
          const bodyText = normalLines.join("\n") || "Reading received";
          
          toast.info(
            <div className="flex flex-col gap-2 w-full">
              <div className="font-bold text-base text-blue-900">{title}</div>
              {device.patient && <div className="text-sm font-semibold text-blue-800">DOB: {dobStr}</div>}
              <div className="text-sm text-blue-800 whitespace-pre-wrap">{bodyText}</div>
            </div>,
            {
              style: { backgroundColor: '#e0f2fe', borderColor: '#7dd3fc' },
              duration: 5000,
            }
          );
          
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(title, { body: bodyText, icon: "/favicon.ico", silent: true });
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
  }, [queryClient]);
}
