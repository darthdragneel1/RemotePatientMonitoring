import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useDevice, useDeviceTelemetry, useUpdateDevice, fetchDeviceTelemetryExport } from "@/hooks/useDevices";
import { usePatients } from "@/hooks/usePatients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

  async function handleDownloadPdf() {
    if (!device) return;
    setExporting(true);
    try {
      const events = await fetchDeviceTelemetryExport(device.id, { kind: "TELEMETRY", from, to });
      if (events.length === 0) {
        toast.error("No telemetry in this range to export");
        return;
      }
      downloadTelemetryPdf({
        deviceLabel: device.deviceId,
        modelNumber: device.modelNumber,
        events,
        from,
        to,
        patientThresholds: device.patient?.vitalThresholds,
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

  const telemetryColumns = getTelemetryColumns(device.modelNumber);
  const patientThresholds = device.patient?.vitalThresholds;
  const events = telemetryPage?.events ?? [];

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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recorded At</TableHead>
                    {telemetryColumns.map((column) => (
                      <TableHead key={column.label}>{column.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => {
                    const data = getTelemetryData(event.payload);
                    return (
                      <TableRow key={event.id}>
                        <TableCell>{new Date(event.recordedAt).toLocaleString()}</TableCell>
                        {telemetryColumns.map((column) => {
                          const status = column.metricKey
                            ? getVitalStatus(
                                getThresholdFor(patientThresholds, column.metricKey),
                                column.getNumeric?.(data)
                              )
                            : null;
                          return (
                            <TableCell key={column.label} className={status ? VITAL_STATUS_CLASS[status] : undefined}>
                              {column.get(data)}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

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
    </div>
  );
}
