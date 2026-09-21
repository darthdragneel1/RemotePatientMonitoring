import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { usePatient, useUpdatePatient, useDeletePatient } from "@/hooks/usePatients";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { VitalThresholdsEditor } from "@/components/VitalThresholdsEditor";
import { VITAL_METRICS } from "@/lib/vitalMetrics";
import type { VitalThresholds } from "@/lib/types";

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
  const [vitalThresholds, setVitalThresholds] = useState<VitalThresholds>({});
  const [error, setError] = useState<string | null>(null);

  function startEditing() {
    if (!patient) return;
    setFirstName(patient.firstName);
    setLastName(patient.lastName);
    setPhone(patient.phone ?? "");
    setVitalThresholds(patient.vitalThresholds ?? {});
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
        vitalThresholds,
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
              <div className="grid grid-cols-2 gap-4">
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
              <VitalThresholdsEditor value={vitalThresholds} onChange={setVitalThresholds} />
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

              {patient.vitalThresholds && Object.keys(patient.vitalThresholds).length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Alert Thresholds</p>
                  <ul className="space-y-1">
                    {VITAL_METRICS.filter((m) => patient.vitalThresholds?.[m.key]).map((m) => {
                      const t = patient.vitalThresholds![m.key]!;
                      const parts = [
                        t.redLow !== undefined && `red below ${t.redLow}`,
                        t.orangeLow !== undefined && `orange below ${t.orangeLow}`,
                        t.orangeHigh !== undefined && `orange above ${t.orangeHigh}`,
                        t.redHigh !== undefined && `red above ${t.redHigh}`,
                      ].filter(Boolean);
                      return (
                        <li key={m.key}>
                          <span className="font-medium">{m.label}</span> ({m.unit}): {parts.join(", ")}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold">Linked Devices</h2>
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
