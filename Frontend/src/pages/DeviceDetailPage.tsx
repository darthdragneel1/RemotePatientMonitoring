import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useDevice, useDeviceTelemetry, useUpdateDevice, fetchDeviceTelemetryExport, useUpdateTelemetryCommunication } from "@/hooks/useDevices";
import { usePatients } from "@/hooks/usePatients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getTelemetryColumns,
  getTelemetryData,
  getThresholdFor,
  getVitalStatus,
  VITAL_STATUS_CLASS,
} from "@/lib/telemetryDisplay";
import { downloadTelemetryPdf } from "@/lib/telemetryPdf";
import { ApiError } from "@/lib/api";
import { CommunicationDialog } from "@/components/CommunicationDialog";
import { FileEdit } from "lucide-react";

const UNASSIGNED = "__unassigned__";

function toStartOfDayIso(date: string): string {
  return `${date}T00:00:00.000Z`;
}

function toEndOfDayIso(date: string): string {
  return `${date}T23:59:59.999Z`;
}

export function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: device, isLoading } = useDevice(id);
  const { data: patients } = usePatients();
  const updateDevice = useUpdateDevice(id!);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [commDialog, setCommDialog] = useState<{ isOpen: boolean; eventId: string; initialText: string | null }>({
    isOpen: false,
    eventId: "",
    initialText: null,
  });

  const updateCommunication = useUpdateTelemetryCommunication(id!);

  // AHA and ACC standard normal ranges for BP and pulse
  const [sysLimits, setSysLimits] = useState([90, 120]);
  const [diaLimits, setDiaLimits] = useState([60, 80]);
  const [pulseLimits, setPulseLimits] = useState([60, 100]);

  const from = fromDate ? toStartOfDayIso(fromDate) : undefined;
  const to = toDate ? toEndOfDayIso(toDate) : undefined;

  const { data: telemetryPage, isLoading: eventsLoading } = useDeviceTelemetry(id, {
    kind: "TELEMETRY",
    from,
    to,
    page,
  });

  function handleFilterChange(nextFrom: string, nextTo: string) {
    setFromDate(nextFrom);
    setToDate(nextTo);
    setPage(1);
  }

  async function handleReassign(value: string | null) {
    await updateDevice.mutateAsync({ patientId: !value || value === UNASSIGNED ? null : value });
    toast.success("Patient assignment updated");
  }

  async function handleSaveCommunication(text: string) {
    try {
      await updateCommunication.mutateAsync({ eventId: commDialog.eventId, communication: text });
      toast.success("Communication updated");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update communication");
    }
  }

  async function handleDownloadPdf() {
    if (!device) return;
    setExporting(true);
    try {
      const events = await fetchDeviceTelemetryExport(device.id, { kind: "TELEMETRY", from, to });
      if (events.length === 0) {
        toast.error("No telemetry in this range to export");
        return;
      }
      const patientData = device.patientId && patients ? patients.find(p => p.id === device.patientId) : null;
      
      downloadTelemetryPdf({
        deviceLabel: device.deviceId,
        modelNumber: device.modelNumber,
        events,
        from,
        to,
        patientThresholds: device.patient?.vitalThresholds,
        patientName: patientData ? `${patientData.firstName} ${patientData.lastName}` : null,
        patientDob: patientData?.dateOfBirth,
        patientPhone: patientData?.phone,
      });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to generate PDF");
    } finally {
      setExporting(false);
    }
  }

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!device) {
    return <p className="text-muted-foreground">Device not found.</p>;
  }

  const patientThresholds = device.patient?.vitalThresholds;
  const events = telemetryPage?.events ?? [];
  const firstEventPayload = events.length > 0 ? events[0].payload : undefined;
  const telemetryColumns = getTelemetryColumns(device.modelNumber, firstEventPayload);
  const hasCustomTimestamp = telemetryColumns.some((c) => c.label.toLowerCase().includes("timestamp"));
  const hasBPColumns = telemetryColumns.some((c) => c.metricKey === "sys" || c.metricKey === "dia" || c.metricKey === "pulse");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/devices" className="text-sm text-muted-foreground hover:underline">
            ← Devices
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">{device.deviceId}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Device Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Model</span>
              <span>{device.modelNumber ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">IMEI</span>
              <span>{device.imei ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Serial Number</span>
              <span>{device.sn ?? "—"}</span>
            </div>
            {device.org && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Organization</span>
                <span>{device.org.name}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Patient</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={device.patientId ?? UNASSIGNED} onValueChange={handleReassign}>
              <SelectTrigger>
                <SelectValue>
                  {(value: string | null) => {
                    if (!value || value === UNASSIGNED) return "Unassigned";
                    const patient = patients?.find((p) => p.id === value);
                    return patient ? `${patient.firstName} ${patient.lastName}` : value;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                {patients?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.firstName} {p.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {device.patient && (
              <Link to={`/patients/${device.patient.id}`} className="text-sm text-primary hover:underline">
                View patient →
              </Link>
            )}
          </CardContent>
        </Card>

        {hasBPColumns && (
          <Card>
            <CardHeader>
              <CardTitle>Display Thresholds (AHA/ACC)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Label>Systolic (Normal: {sysLimits[0]} - {sysLimits[1]})</Label>
                </div>
                <Slider min={50} max={200} step={1} value={sysLimits} onValueChange={(v) => setSysLimits(v as number[])} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Label>Diastolic (Normal: {diaLimits[0]} - {diaLimits[1]})</Label>
                </div>
                <Slider min={30} max={130} step={1} value={diaLimits} onValueChange={(v) => setDiaLimits(v as number[])} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Label>Pulse (Normal: {pulseLimits[0]} - {pulseLimits[1]})</Label>
                </div>
                <Slider min={30} max={180} step={1} value={pulseLimits} onValueChange={(v) => setPulseLimits(v as number[])} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-lg font-semibold">Telemetry History</h2>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="fromDate" className="text-xs text-muted-foreground">
                From
              </Label>
              <Input
                id="fromDate"
                type="date"
                className="h-8 w-36"
                value={fromDate}
                onChange={(e) => handleFilterChange(e.target.value, toDate)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="toDate" className="text-xs text-muted-foreground">
                To
              </Label>
              <Input
                id="toDate"
                type="date"
                className="h-8 w-36"
                value={toDate}
                onChange={(e) => handleFilterChange(fromDate, e.target.value)}
              />
            </div>
            {(fromDate || toDate) && (
              <Button variant="outline" size="sm" onClick={() => handleFilterChange("", "")}>
                Clear
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={exporting}>
              {exporting ? "Preparing…" : "Download PDF"}
            </Button>
          </div>
        </div>

        <div className="mt-4">
          {eventsLoading && !telemetryPage ? (
            <Skeleton className="h-32 w-full" />
          ) : events.length === 0 ? (
            <p className="text-muted-foreground">No telemetry recorded in this range.</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-md border border-border">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      {!hasCustomTimestamp && <TableHead className="whitespace-nowrap">Recorded At</TableHead>}
                      {telemetryColumns.map((column) => (
                        <TableHead key={column.label} className="whitespace-nowrap">{column.label}</TableHead>
                      ))}
                      <TableHead className="whitespace-nowrap">Communication</TableHead>
                      <TableHead className="whitespace-nowrap">Comm Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => {
                      const data = getTelemetryData(event.payload);
                      return (
                        <TableRow key={event.id}>
                          {!hasCustomTimestamp && (
                            <TableCell className="whitespace-nowrap">{new Date(event.recordedAt).toLocaleString()}</TableCell>
                          )}
                          {telemetryColumns.map((column) => {
                            const value = column.getNumeric?.(data);
                            let statusClass: string | undefined = undefined;

                            if (column.metricKey === "sys") {
                              statusClass =
                                value === undefined
                                  ? undefined
                                  : value < sysLimits[0] || value > sysLimits[1]
                                    ? "text-red-600 font-semibold"
                                    : "text-foreground font-normal";
                            } else if (column.metricKey === "dia") {
                              statusClass =
                                value === undefined
                                  ? undefined
                                  : value < diaLimits[0] || value > diaLimits[1]
                                    ? "text-red-600 font-semibold"
                                    : "text-foreground font-normal";
                            } else if (column.metricKey === "pulse") {
                              statusClass =
                                value === undefined
                                  ? undefined
                                  : value < pulseLimits[0] || value > pulseLimits[1]
                                    ? "text-red-600 font-semibold"
                                    : "text-foreground font-normal";
                            } else {
                              const status = column.metricKey
                                ? getVitalStatus(
                                    getThresholdFor(patientThresholds, column.metricKey),
                                    value
                                  )
                                : null;
                              statusClass = status ? VITAL_STATUS_CLASS[status] : undefined;
                            }

                            return (
                              <TableCell key={column.label} className={`${statusClass ?? ""} whitespace-nowrap`}>
                                {column.get(data)}
                              </TableCell>
                            );
                          })}
                          <TableCell className="min-w-[150px] max-w-[300px]">
                            {event.communication ? (
                              <div className="flex items-start justify-between gap-2">
                                <span className="truncate text-sm" title={event.communication}>
                                  {event.communication}
                                </span>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 shrink-0"
                                  onClick={() => setCommDialog({ isOpen: true, eventId: event.id, initialText: event.communication || "" })}
                                >
                                  <FileEdit className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 text-xs"
                                onClick={() => setCommDialog({ isOpen: true, eventId: event.id, initialText: "" })}
                              >
                                Add Note
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                            {event.communicationAt ? new Date(event.communicationAt).toLocaleString() : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {telemetryPage && telemetryPage.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Page {telemetryPage.page} of {telemetryPage.totalPages} ({telemetryPage.total} total)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(telemetryPage.totalPages, p + 1))}
                      disabled={page >= telemetryPage.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <CommunicationDialog
        isOpen={commDialog.isOpen}
        initialText={commDialog.initialText}
        onClose={() => setCommDialog({ isOpen: false, eventId: "", initialText: null })}
        onSave={handleSaveCommunication}
      />
    </div>
  );
}
