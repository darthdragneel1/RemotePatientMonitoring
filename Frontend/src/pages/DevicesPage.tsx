import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useDevices, useCreateDevice, useUpdateDevice } from "@/hooks/useDevices";
import { usePatients } from "@/hooks/usePatients";
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

function UnassignDeviceDialog({ deviceId, deviceName }: { deviceId: string; deviceName: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const updateDevice = useUpdateDevice(deviceId);

  async function handleUnassign() {
    setError(null);
    try {
      await updateDevice.mutateAsync({ patientId: null });
      toast.success("Device unassigned");
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm">Unassign</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unassign Device</DialogTitle>
        </DialogHeader>
        <p>Are you sure you want to unassign device <strong>{deviceName}</strong> from its current patient?</p>
        {error && <p className="text-sm text-destructive font-medium bg-destructive/10 p-2 rounded">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleUnassign} disabled={updateDevice.isPending}>
            {updateDevice.isPending ? "Unassigning…" : "Unassign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DevicesPage() {
  const { user } = useAuth();
  const { data: devices, isLoading } = useDevices();
  const { data: patients } = usePatients();
  const createDevice = useCreateDevice();

  const [open, setOpen] = useState(false);
  const [deviceId, setDeviceId] = useState("");
  const [modelNumber, setModelNumber] = useState("");
  const [imei, setImei] = useState("");
  const [sn, setSn] = useState("");
  const [patientId, setPatientId] = useState<string>("");
  const [orgId, setOrgId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const { data: organizations } = useOrganizations();

  function resetForm() {
    setDeviceId("");
    setModelNumber("");
    setImei("");
    setSn("");
    setPatientId("");
    setOrgId("");
    setError(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetForm();
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (user?.role === "SUPER_ADMIN" && !orgId) {
      setError("Organization is required for System Admins");
      return;
    }
    setError(null);
    try {
      await createDevice.mutateAsync({
        deviceId,
        modelNumber: modelNumber || undefined,
        imei: imei || undefined,
        sn: sn || undefined,
        patientId: patientId || undefined,
        ...(user?.role === "SUPER_ADMIN" ? { orgId } : {}),
      });
      toast.success("Device added");
      setOpen(false);
      resetForm();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Devices</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger render={<Button>Add Device</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Device</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {user?.role === "SUPER_ADMIN" && (
                <div className="space-y-2">
                  <Label>Organization <span className="text-destructive">*</span></Label>
                  <Select value={orgId} onValueChange={(v) => setOrgId(v ?? "")} required>
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
              <div className="space-y-2">
                <Label htmlFor="deviceId">Device ID <span className="text-destructive">*</span></Label>
                <Input id="deviceId" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modelNumber">Model Number</Label>
                <Input id="modelNumber" value={modelNumber} onChange={(e) => setModelNumber(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imei">IMEI</Label>
                <Input id="imei" value={imei} onChange={(e) => setImei(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sn">Serial Number</Label>
                <Input id="sn" value={sn} onChange={(e) => setSn(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Patient (optional)</Label>
                <Select value={patientId} onValueChange={(v) => setPatientId(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.firstName} {p.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <DialogFooter>
                <Button type="submit" disabled={createDevice.isPending}>
                  {createDevice.isPending ? "Adding…" : "Add Device"}
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
        ) : devices?.length === 0 ? (
          <p className="text-muted-foreground">No devices yet — add one to get started.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device ID</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Patient</TableHead>
                {user?.role === "SUPER_ADMIN" && <TableHead>Organization</TableHead>}
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices?.map((device) => (
                <TableRow key={device.id}>
                  <TableCell>
                    <Link to={`/devices/${device.id}`} className="font-medium text-primary hover:underline">
                      {device.deviceId}
                    </Link>
                  </TableCell>
                  <TableCell>{device.modelNumber ?? "—"}</TableCell>
                  <TableCell>
                    {device.patient ? `${device.patient.firstName} ${device.patient.lastName}` : "Unassigned"}
                  </TableCell>
                  {user?.role === "SUPER_ADMIN" && <TableCell>{device.org?.name ?? "—"}</TableCell>}
                  <TableCell>
                    {device.patient && <UnassignDeviceDialog deviceId={device.id} deviceName={device.deviceId} />}
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
