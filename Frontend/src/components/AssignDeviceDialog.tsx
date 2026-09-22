import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarcodeScanner } from "./BarcodeScanner";
import { useDevices, useCreateDevice } from "@/hooks/useDevices";
import { toast } from "sonner";
import { QrCode } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DeviceUpdateInput } from "@/hooks/useDevices";

export function AssignDeviceDialog({ patientId }: { patientId: string }) {
  const [open, setOpen] = useState(false);
  const [manualId, setManualId] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: devices } = useDevices();
  const createDevice = useCreateDevice();
  
  const queryClient = useQueryClient();
  const updateDevice = useMutation({
    mutationFn: ({ id, data }: { id: string; data: DeviceUpdateInput }) => api.patch(`/devices/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      queryClient.invalidateQueries({ queryKey: ["patients", patientId] });
    },
  });

  async function handleAssign(deviceId: string) {
    if (!deviceId) return;
    setIsProcessing(true);
    
    try {
      // 1. Check if device exists in this org
      const existingDevice = devices?.find(d => d.deviceId === deviceId);
      
      if (existingDevice) {
        // Update existing device to link to this patient
        await updateDevice.mutateAsync({
          id: existingDevice.id,
          data: { patientId }
        });
        toast.success(`Device ${deviceId} assigned to patient`);
      } else {
        // Create new device and link to this patient
        await createDevice.mutateAsync({
          deviceId,
          patientId
        });
        toast.success(`New device ${deviceId} created and assigned`);
      }
      
      setOpen(false);
      setManualId("");
      setIsScanning(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to assign device");
    } finally {
      setIsProcessing(false);
    }
  }

  function onScanSuccess(decodedText: string) {
    if (isProcessing) return;
    
    // Extract only the last 12 characters of the scanned barcode
    const finalId = decodedText.slice(-12);
    
    toast.success("Code scanned successfully! Please confirm details to link.");
    setManualId(finalId);
    setIsScanning(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" className="gap-2" />}>
        <QrCode className="h-4 w-4" />
        Scan & Link Device
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link Device</DialogTitle>
          <DialogDescription>
            Scan a device barcode/Data Matrix or enter the Device ID manually.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          {!isScanning ? (
            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg bg-muted/20">
              <QrCode className="h-10 w-10 text-muted-foreground mb-4" />
              <Button onClick={() => setIsScanning(true)} variant="secondary">
                Open Camera Scanner
              </Button>
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden bg-black flex flex-col items-center p-2 relative">
              <BarcodeScanner 
                onScan={onScanSuccess} 
                onError={() => {
                  // html5-qrcode frequently throws silent errors while seeking
                  // so we don't spam the console or toast unless it's critical
                }} 
              />
              <Button 
                variant="destructive" 
                size="sm" 
                className="mt-4 absolute bottom-4 z-20"
                onClick={() => setIsScanning(false)}
              >
                Cancel Scanner
              </Button>
            </div>
          )}

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or enter manually</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="deviceId" className="sr-only">
                Device ID
              </Label>
              <Input
                id="deviceId"
                placeholder="e.g. 100262500475"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
              />
            </div>
            <Button 
              disabled={!manualId || isProcessing} 
              onClick={() => handleAssign(manualId)}
            >
              Link
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
