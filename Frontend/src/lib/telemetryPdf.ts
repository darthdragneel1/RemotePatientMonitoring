import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { getTelemetryColumns, getTelemetryData, getThresholdFor, getVitalStatus, type VitalStatus } from "./telemetryDisplay";
import type { TelemetryEvent, VitalThresholds } from "./types";

const STATUS_RGB: Record<VitalStatus, [number, number, number]> = {
  green: [5, 150, 105], // emerald-600
  orange: [217, 119, 6], // amber-600
  red: [220, 38, 38], // red-600
};

interface DownloadTelemetryPdfOptions {
  deviceLabel: string;
  modelNumber: string | null;
  events: TelemetryEvent[];
  from?: string;
  to?: string;
  patientThresholds?: VitalThresholds | null;
  patientName?: string | null;
  patientDob?: string | null;
  patientPhone?: string | null;
}

export function downloadTelemetryPdf({
  deviceLabel,
  modelNumber,
  events,
  from,
  to,
  patientThresholds,
}: DownloadTelemetryPdfOptions) {
  const columns = getTelemetryColumns(modelNumber);
  const doc = new jsPDF();

  doc.setFontSize(14);
  doc.text(`Telemetry Report — ${deviceLabel}`, 14, 16);

  doc.setFontSize(10);
  doc.setTextColor(100);
  
  if (patientName) {
    doc.text(`Patient: ${patientName}`, 14, 23);
    doc.text(`DOB: ${patientDob || "N/A"} | Phone: ${patientPhone || "N/A"}`, 14, 28);
  }

  const rangeLabel =
    from || to
      ? `${from ? new Date(from).toLocaleDateString() : "start"} – ${to ? new Date(to).toLocaleDateString() : "now"}`
      : "All time";
  const startY = patientName ? 33 : 23;
  
  doc.text(`Range: ${rangeLabel}`, 14, startY);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, startY + 5);

  const rowData = events.map((event) => getTelemetryData(event.payload));

  const statuses = rowData.map((data) =>
    columns.map((c) =>
      c.metricKey ? getVitalStatus(getThresholdFor(patientThresholds, c.metricKey), c.getNumeric?.(data)) : null
    )
  );

  autoTable(doc, {
    head: [["Recorded At", ...columns.map((c) => c.label), "Communication", "Comm Timestamp"]],
    body: events.map((event, i) => [
      new Date(event.recordedAt).toLocaleString(),
      ...columns.map((c) => c.get(rowData[i])),
      event.communication || "—",
      event.communicationAt ? new Date(event.communicationAt).toLocaleString() : "—"
    ]),
    startY: startY + 11,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] }, // Clinical Blue theme primary
    didParseCell: (data) => {
      if (data.section !== "body") return;
      const colIndex = data.column.index - 1; // shift left: column 0 is "Recorded At"
      if (colIndex < 0) return;
      const status = statuses[data.row.index]?.[colIndex];
      if (status) {
        data.cell.styles.textColor = STATUS_RGB[status];
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  const dateStamp = new Date().toISOString().slice(0, 10);
  doc.save(`telemetry-${deviceLabel}-${dateStamp}.pdf`);
}
