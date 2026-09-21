import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { usePatients, useCreatePatient, useDeletePatient } from "@/hooks/usePatients";
import { useOrganizations } from "@/hooks/useAdmin";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { VitalThresholdsEditor } from "@/components/VitalThresholdsEditor";
import type { VitalThresholds } from "@/lib/types";

function DeletePatientDialog({ patientId, patientName }: { patientId: string; patientName: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deletePatient = useDeletePatient();

  async function handleDelete() {
    setError(null);
    try {
      await deletePatient.mutateAsync(patientId);
      toast.success("Patient removed");
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" size="sm">Remove</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove Patient</DialogTitle>
        </DialogHeader>
        <p>Are you sure you want to remove <strong>{patientName}</strong>? This action cannot be undone.</p>
        {error && <p className="text-sm text-destructive font-medium bg-destructive/10 p-2 rounded">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deletePatient.isPending}>
            {deletePatient.isPending ? "Removing…" : "Remove"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PatientsPage() {
  const { user } = useAuth();
  const { data: patients, isLoading } = usePatients();
  const { data: organizations } = useOrganizations();
  const createPatient = useCreatePatient();

  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [mrn, setMrn] = useState("");
  const [phone, setPhone] = useState("");
  const [orgId, setOrgId] = useState("");
  const [vitalThresholds, setVitalThresholds] = useState<VitalThresholds>({});
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setFirstName("");
    setLastName("");
    setDateOfBirth("");
    setMrn("");
    setPhone("");
    setOrgId("");
    setVitalThresholds({});
    setError(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) resetForm();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (user?.role === "SUPER_ADMIN" && !orgId) {
      setError("Organization is required for System Admins");
      return;
    }
    setError(null);
    try {
      await createPatient.mutateAsync({
        firstName,
        lastName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString() : undefined,
        mrn: mrn || undefined,
        phone: phone || undefined,
        vitalThresholds: Object.keys(vitalThresholds).length > 0 ? vitalThresholds : undefined,
        ...(user?.role === "SUPER_ADMIN" ? { orgId } : {}),
      });
      toast.success("Patient added");
      setOpen(false);
      resetForm();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Patients</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger render={<Button>Add Patient</Button>} />
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Patient</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {user?.role === "SUPER_ADMIN" && (
                <div className="space-y-2">
                  <Label>Organization <span className="text-destructive">*</span></Label>
                  <Select value={orgId} onValueChange={setOrgId} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations?.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
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
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mrn">MRN</Label>
                <Input id="mrn" value={mrn} onChange={(e) => setMrn(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <VitalThresholdsEditor value={vitalThresholds} onChange={setVitalThresholds} />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <DialogFooter>
                <Button type="submit" disabled={createPatient.isPending}>
                  {createPatient.isPending ? "Adding…" : "Add Patient"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : patients?.length === 0 ? (
          <p className="text-muted-foreground">No patients yet — add one to get started.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Date of Birth</TableHead>
                <TableHead>MRN</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients?.map((patient) => (
                <TableRow key={patient.id}>
                  <TableCell>
                    <Link to={`/patients/${patient.id}`} className="font-medium text-primary hover:underline">
                      {patient.firstName} {patient.lastName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell>{patient.mrn ?? "—"}</TableCell>
                  <TableCell>{patient.phone ?? "—"}</TableCell>
                  <TableCell>
                    <DeletePatientDialog patientId={patient.id} patientName={`${patient.firstName} ${patient.lastName}`} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
