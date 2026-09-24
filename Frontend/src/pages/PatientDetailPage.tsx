import { useState, useEffect, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { usePatient, useUpdatePatient, useDeletePatient } from "@/hooks/usePatients";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { AssignDeviceDialog } from "@/components/AssignDeviceDialog";
import type { VitalThresholds, VitalMetricKey, VitalThreshold } from "@/lib/types";

export function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: patient, isLoading } = usePatient(id);
  const updatePatient = useUpdatePatient(id!);
  const deletePatient = useDeletePatient();

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [sysLimits, setSysLimits] = useState<number[]>([80, 90, 130, 140]);
  const [diaLimits, setDiaLimits] = useState<number[]>([50, 60, 85, 90]);
  const [pulseLimits, setPulseLimits] = useState<number[]>([40, 50, 100, 120]);
  const [savingMetric, setSavingMetric] = useState<string | null>(null);

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
    setPhone(patient.phone ?? "");
    setEditing(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await updatePatient.mutateAsync({
        firstName,
        lastName,
        phone: phone || undefined,
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
        <Button variant="destructive" onClick={handleDelete} disabled={deletePatient.isPending}>
          Delete Patient
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Patient Info</CardTitle>
            {!editing && (
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
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
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
                    <span>{patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : "—"}</span>
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
            <div className="pt-2 space-y-6">
              <div className="flex justify-between text-sm">
                <Label>Systolic (Normal: {sysLimits[1]} - {sysLimits[2]} mmHg)</Label>
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
            <div className="pt-2 space-y-6">
              <div className="flex justify-between text-sm">
                <Label>Diastolic (Normal: {diaLimits[1]} - {diaLimits[2]} mmHg)</Label>
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
            <div className="pt-2 space-y-6">
              <div className="flex justify-between text-sm">
                <Label>Pulse (Normal: {pulseLimits[1]} - {pulseLimits[2]} bpm)</Label>
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
    </div>
  );
}

