import { useState, useEffect, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import {
  usePatient,
  useUpdatePatient,
  useDeletePatient,
  usePatientTelemetry,
  useUpdatePatientTelemetryCommunication,
  fetchPatientTelemetryExport,
} from "@/hooks/usePatients";
import { ApiError } from "@/lib/api";
import { formatDob, toDateInputValue, toDobIsoString } from "@/lib/dateUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { AssignDeviceDialog } from "@/components/AssignDeviceDialog";
import { CommunicationDialog } from "@/components/CommunicationDialog";
import { FileEdit } from "lucide-react";
import { downloadTelemetryPdf } from "@/lib/telemetryPdf";
import {
  getTelemetryColumns,
  getTelemetryData,
  getThresholdFor,
  getVitalStatus,
  VITAL_STATUS_CLASS,
} from "@/lib/telemetryDisplay";
import type { VitalThresholds, VitalMetricKey, VitalThreshold } from "@/lib/types";

function toStartOfDayIso(date: string): string {
  return `${date}T00:00:00.000Z`;
}

function toEndOfDayIso(date: string): string {
  return `${date}T23:59:59.999Z`;
}

export function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "ORG_ADMIN" || user?.role === "SUPER_ADMIN";
  const { data: patient, isLoading } = usePatient(id);
  const updatePatient = useUpdatePatient(id!);
  const deletePatient = useDeletePatient();

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [mrn, setMrn] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [sysLimits, setSysLimits] = useState<number[]>([80, 90, 130, 140]);
  const [diaLimits, setDiaLimits] = useState<number[]>([50, 60, 85, 90]);
  const [pulseLimits, setPulseLimits] = useState<number[]>([40, 50, 100, 120]);
  const [savingMetric, setSavingMetric] = useState<string | null>(null);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [commDialog, setCommDialog] = useState<{ isOpen: boolean; eventId: string; initialText: string | null }>({
    isOpen: false,
    eventId: "",
    initialText: null,
  });

  const from = fromDate ? toStartOfDayIso(fromDate) : undefined;
  const to = toDate ? toEndOfDayIso(toDate) : undefined;

  const { data: telemetryPage, isLoading: eventsLoading } = usePatientTelemetry(id, {
    kind: "TELEMETRY",
    from,
    to,
    page,
    limit: 25,
  });

  const updateCommunication = useUpdatePatientTelemetryCommunication(id!);

  function handleFilterChange(nextFrom: string, nextTo: string) {
    setFromDate(nextFrom);
    setToDate(nextTo);
    setPage(1);
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
    if (!patient) return;
    setExporting(true);
    try {
      const events = await fetchPatientTelemetryExport(patient.id, { kind: "TELEMETRY", from, to });
      if (events.length === 0) {
        toast.error("No telemetry in this range to export");
        return;
      }
      downloadTelemetryPdf({
        events,
        from,
        to,
        patientThresholds: patient.vitalThresholds,
        patientName: `${patient.firstName} ${patient.lastName}`,
        patientDob: patient.dateOfBirth,
        patientPhone: patient.phone,
      });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to generate PDF");
    } finally {
      setExporting(false);
    }
  }

  // Sync slider limits when patient loads or changes
  useEffect(() => {
    if (savingMetric) return;
    if (patient) {
      const vt = patient.vitalThresholds;
      setSysLimits([
        vt?.sys?.redLow ?? 80,
        vt?.sys?.orangeLow ?? 90,
        vt?.sys?.orangeHigh ?? 130,
        vt?.sys?.redHigh ?? 140,
      ]);
      setDiaLimits([
        vt?.dia?.redLow ?? 50,
        vt?.dia?.orangeLow ?? 60,
        vt?.dia?.orangeHigh ?? 85,
        vt?.dia?.redHigh ?? 90,
      ]);
      setPulseLimits([
        vt?.pulse?.redLow ?? 40,
        vt?.pulse?.orangeLow ?? 50,
        vt?.pulse?.orangeHigh ?? 100,
        vt?.pulse?.redHigh ?? 120,
      ]);
    }
  }, [
    patient?.vitalThresholds?.sys?.orangeLow,
    patient?.vitalThresholds?.sys?.orangeHigh,
    patient?.vitalThresholds?.sys?.redLow,
    patient?.vitalThresholds?.sys?.redHigh,
    patient?.vitalThresholds?.dia?.orangeLow,
    patient?.vitalThresholds?.dia?.orangeHigh,
    patient?.vitalThresholds?.dia?.redLow,
    patient?.vitalThresholds?.dia?.redHigh,
    patient?.vitalThresholds?.pulse?.orangeLow,
    patient?.vitalThresholds?.pulse?.orangeHigh,
    patient?.vitalThresholds?.pulse?.redLow,
    patient?.vitalThresholds?.pulse?.redHigh,
    savingMetric,
    patient,
  ]);

  function startEditing() {
    if (!patient) return;
    setFirstName(patient.firstName);
    setLastName(patient.lastName);
    setDateOfBirth(toDateInputValue(patient.dateOfBirth));
    setGender(patient.gender ?? "");
    setPhone(patient.phone ?? "");
    setMrn(patient.mrn ?? "");
    setError(null);
    setEditing(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await updatePatient.mutateAsync({
        firstName,
        lastName,
        dateOfBirth: toDobIsoString(dateOfBirth),
        gender: gender || null,
        phone: phone || null,
        mrn: mrn || null,
      });
      toast.success("Patient updated");
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this patient? Linked devices will become unassigned.")) return;
    await deletePatient.mutateAsync(id!);
    toast.success("Patient deleted");
    navigate("/patients");
  }

  async function handleCommitThresholds(metricKey: VitalMetricKey, limits: number[]) {
    if (!patient) return;

    // ensure order is strictly increasing
    const sortedLimits = [...limits].sort((a, b) => a - b);
    const [redLow, orangeLow, orangeHigh, redHigh] = sortedLimits;
    const currentThresholds = (patient.vitalThresholds ?? {}) as VitalThresholds;
    const existingMetric = currentThresholds[metricKey];

    const updatedMetricThreshold: VitalThreshold = {
      ...existingMetric,
      redLow,
      orangeLow,
      orangeHigh,
      redHigh,
    };

    const nextThresholds: VitalThresholds = {
      ...currentThresholds,
      [metricKey]: updatedMetricThreshold,
    };

    const metricNames: Record<string, string> = {
      sys: "Systolic",
      dia: "Diastolic",
      pulse: "Pulse",
    };
    const metricLabel = metricNames[metricKey] || metricKey;

    setSavingMetric(metricKey);
    try {
      await updatePatient.mutateAsync({
        patientId: patient.id,
        vitalThresholds: nextThresholds,
      });
      toast.success(`Updated ${metricLabel} thresholds for ${patient.firstName}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update threshold");
      const vt = patient.vitalThresholds;
      if (metricKey === "sys") {
        setSysLimits([vt?.sys?.redLow ?? 80, vt?.sys?.orangeLow ?? 90, vt?.sys?.orangeHigh ?? 130, vt?.sys?.redHigh ?? 140]);
      } else if (metricKey === "dia") {
        setDiaLimits([vt?.dia?.redLow ?? 50, vt?.dia?.orangeLow ?? 60, vt?.dia?.orangeHigh ?? 85, vt?.dia?.redHigh ?? 90]);
      } else if (metricKey === "pulse") {
        setPulseLimits([vt?.pulse?.redLow ?? 40, vt?.pulse?.orangeLow ?? 50, vt?.pulse?.orangeHigh ?? 100, vt?.pulse?.redHigh ?? 120]);
      }
    } finally {
      setSavingMetric(null);
    }
  }

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!patient) {
    return <p className="text-muted-foreground">Patient not found.</p>;
  }

  const devices = patient.devices ?? [];
  const events = telemetryPage?.events ?? [];
  const firstEventPayload = events.length > 0 ? events[0].payload : undefined;
  const primaryModel = devices.length > 0 ? devices[0].modelNumber : undefined;
  const telemetryColumns = getTelemetryColumns(primaryModel, firstEventPayload);
  const hasCustomTimestamp = telemetryColumns.some((c) => c.label.toLowerCase().includes("timestamp"));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/patients" className="text-sm text-muted-foreground hover:underline">
            ← Patients
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">
            {patient.firstName} {patient.lastName}
          </h1>
        </div>
        {isAdmin && (
          <Button variant="destructive" onClick={handleDelete} disabled={deletePatient.isPending}>
            Delete Patient
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Patient Info</CardTitle>
            {isAdmin && !editing && (
              <Button variant="outline" size="sm" onClick={startEditing}>
                Edit
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {editing ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">
                      First Name <span className="text-destructive">*</span>
                    </Label>
                    <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">
                      Last Name <span className="text-destructive">*</span>
                    </Label>
                    <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select value={gender || "NONE"} onValueChange={(v) => setGender(!v || v === "NONE" ? "" : v)}>
                      <SelectTrigger id="gender" className="w-full">
                        <SelectValue>
                          {(value: string | null) => {
                            if (!value || value === "NONE") return "Select Gender";
                            return value;
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">Select Gender</SelectItem>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                        <SelectItem value="Unspecified">Unspecified</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mrn">MRN</Label>
                    <Input id="mrn" value={mrn} onChange={(e) => setMrn(e.target.value)} />
                  </div>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="flex gap-2">
                  <Button type="submit" disabled={updatePatient.isPending}>
                    {updatePatient.isPending ? "Saving…" : "Save"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date of Birth</span>
                    <span>{formatDob(patient.dateOfBirth)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gender</span>
                    <span>{patient.gender ?? "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">MRN</span>
                    <span>{patient.mrn ?? "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone</span>
                    <span>{patient.phone ?? "—"}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Display Thresholds</CardTitle>
                <CardDescription className="text-xs">
                  Alert thresholds for {patient.firstName} {patient.lastName}
                </CardDescription>
              </div>
              {savingMetric && (
                <span className="text-xs text-muted-foreground animate-pulse">Saving…</span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="pt-4 pb-2 space-y-10">
              <div className="flex justify-between text-sm">
                <Label className="text-base font-semibold">Systolic</Label>
                {savingMetric === "sys" && <span className="text-xs text-muted-foreground">Saving…</span>}
              </div>
              <Slider
                min={50}
                max={200}
                step={1}
                variant="threshold"
                minStepsBetweenValues={1}
                value={sysLimits}
                onValueChange={(v) => setSysLimits(v as number[])}
                onValueCommitted={(v) => handleCommitThresholds("sys", v as number[])}
              />
            </div>
            <div className="pt-4 pb-2 space-y-10">
              <div className="flex justify-between text-sm">
                <Label className="text-base font-semibold">Diastolic</Label>
                {savingMetric === "dia" && <span className="text-xs text-muted-foreground">Saving…</span>}
              </div>
              <Slider
                min={30}
                max={130}
                step={1}
                variant="threshold"
                minStepsBetweenValues={1}
                value={diaLimits}
                onValueChange={(v) => setDiaLimits(v as number[])}
                onValueCommitted={(v) => handleCommitThresholds("dia", v as number[])}
              />
            </div>
            <div className="pt-4 pb-2 space-y-10">
              <div className="flex justify-between text-sm">
                <Label className="text-base font-semibold">Pulse</Label>
                {savingMetric === "pulse" && <span className="text-xs text-muted-foreground">Saving…</span>}
              </div>
              <Slider
                min={30}
                max={180}
                step={1}
                variant="threshold"
                minStepsBetweenValues={1}
                value={pulseLimits}
                onValueChange={(v) => setPulseLimits(v as number[])}
                onValueCommitted={(v) => handleCommitThresholds("pulse", v as number[])}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Linked Devices</h2>
          <AssignDeviceDialog patientId={patient.id} />
        </div>
        <div className="mt-4">
          {devices.length === 0 ? (
            <p className="text-muted-foreground">No devices linked to this patient.</p>
          ) : (
            <ul className="space-y-2">
              {devices.map((device) => (
                <li key={device.id}>
                  <Link to={`/devices/${device.id}`} className="text-primary hover:underline">
                    {device.deviceId} {device.modelNumber ? `(${device.modelNumber})` : ""}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Patient Telemetry History</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cumulative health metrics rooted to {patient.firstName} {patient.lastName} across all past and current devices.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="patientFromDate" className="text-xs text-muted-foreground">
                From
              </Label>
              <Input
                id="patientFromDate"
                type="date"
                className="h-8 w-36"
                value={fromDate}
                onChange={(e) => handleFilterChange(e.target.value, toDate)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="patientToDate" className="text-xs text-muted-foreground">
                To
              </Label>
              <Input
                id="patientToDate"
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
            <p className="text-muted-foreground">No telemetry recorded for this patient.</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-md border border-border">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      {!hasCustomTimestamp && <TableHead className="whitespace-nowrap">Recorded At</TableHead>}
                      <TableHead className="whitespace-nowrap">Device</TableHead>
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
                          <TableCell className="whitespace-nowrap">
                            {event.device ? (
                              <Link to={`/devices/${event.device.id}`} className="text-primary hover:underline font-mono text-xs">
                                {event.device.deviceId}
                              </Link>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          {telemetryColumns.map((column) => {
                            const value = column.getNumeric?.(data);
                            let activeThreshold: VitalThreshold | undefined;

                            if (column.metricKey === "sys") {
                              const base = getThresholdFor(patient.vitalThresholds, "sys");
                              activeThreshold = {
                                ...base,
                                redLow: sysLimits[0],
                                orangeLow: sysLimits[1],
                                orangeHigh: sysLimits[2],
                                redHigh: sysLimits[3],
                              };
                            } else if (column.metricKey === "dia") {
                              const base = getThresholdFor(patient.vitalThresholds, "dia");
                              activeThreshold = {
                                ...base,
                                redLow: diaLimits[0],
                                orangeLow: diaLimits[1],
                                orangeHigh: diaLimits[2],
                                redHigh: diaLimits[3],
                              };
                            } else if (column.metricKey === "pulse") {
                              const base = getThresholdFor(patient.vitalThresholds, "pulse");
                              activeThreshold = {
                                ...base,
                                redLow: pulseLimits[0],
                                orangeLow: pulseLimits[1],
                                orangeHigh: pulseLimits[2],
                                redHigh: pulseLimits[3],
                              };
                            } else if (column.metricKey) {
                              activeThreshold = getThresholdFor(patient.vitalThresholds, column.metricKey);
                            }

                            const status = column.metricKey ? getVitalStatus(activeThreshold, value) : null;
                            const statusClass = status ? VITAL_STATUS_CLASS[status] : undefined;

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

