import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDob } from "./dateUtils";
import { getTelemetryColumns, getTelemetryData, getThresholdFor, getVitalStatus, type VitalStatus } from "./telemetryDisplay";
import type { TelemetryEvent, VitalThresholds } from "./types";

const STATUS_RGB: Record<VitalStatus, [number, number, number]> = {
  green: [5, 150, 105], // emerald-600
  orange: [217, 119, 6], // amber-600
  red: [220, 38, 38], // red-600
};

interface DownloadTelemetryPdfOptions {
  deviceLabel?: string;
  modelNumber?: string | null;
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
  patientName,
  patientDob,
  patientPhone,
}: DownloadTelemetryPdfOptions) {
  const firstPayload = events.length > 0 ? events[0].payload : undefined;
  const columns = getTelemetryColumns(modelNumber ?? null, firstPayload);
  const doc = new jsPDF();

  const title = patientName
    ? `Telemetry Report — ${patientName}`
    : `Telemetry Report — ${deviceLabel || "Device"}`;

  doc.setFontSize(14);
  doc.text(title, 14, 16);

  doc.setFontSize(10);
  doc.setTextColor(100);
  if (patientName) {
    const dobFormatted = patientDob ? formatDob(patientDob) : "N/A";
    doc.text(`Patient: ${patientName}`, 14, 23);
    doc.text(`DOB: ${dobFormatted} | Phone: ${patientPhone || "N/A"}`, 14, 28);
  } else if (deviceLabel) {
    doc.text(`Device: ${deviceLabel}`, 14, 23);
  }

  const rangeLabel =
    from || to
      ? `${from ? new Date(from).toLocaleDateString() : "start"} – ${to ? new Date(to).toLocaleDateString() : "now"}`
      : "All time";
  const startY = patientName ? 33 : 28;
  
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
  const filePrefix = (patientName ? patientName.toLowerCase().replace(/[^a-z0-9]+/g, "-") : deviceLabel) || "export";
  doc.save(`telemetry-${filePrefix}-${dateStamp}.pdf`);
}
