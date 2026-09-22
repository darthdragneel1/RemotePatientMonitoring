import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (error: any) => void;
}

export function BarcodeScanner({ onScan, onError }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  
  useEffect(() => {
    let scanner: Html5Qrcode;
    let isMounted = true;

    // Use a small timeout to let the DOM settle, as it needs the div to exist
    setTimeout(() => {
      if (!isMounted) return;
      scanner = new Html5Qrcode("barcode-scanner-reader");
      scannerRef.current = scanner;

      scanner.start(
        { facingMode: "environment" }, // Prefer back camera
        {
          fps: 10,
          // Removed qrbox to allow full frame scanning (much better for 1D barcodes)
        },
        (decodedText) => {
          onScan(decodedText);
        },
        (error) => {
          if (onError) onError(error);
        }
      ).then(() => {
        if (isMounted) setIsInitializing(false);
      }).catch(err => {
        console.error("Camera start failed", err);
        if (isMounted) setIsInitializing(false);
      });
    }, 100);

    return () => {
      isMounted = false;
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [onScan, onError]);

  return (
    <div className="w-full relative min-h-[300px] flex flex-col items-center justify-center bg-black">
      {isInitializing && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/50">
          <p className="text-sm text-muted-foreground animate-pulse">Initializing rear camera...</p>
        </div>
      )}
      <div id="barcode-scanner-reader" className="w-full max-w-[400px] overflow-hidden rounded-md border-none" />
      <style>{`
        #barcode-scanner-reader video {
          object-fit: cover;
          border-radius: 0.375rem;
          width: 100% !important;
        }
      `}</style>
    </div>
  );
}
