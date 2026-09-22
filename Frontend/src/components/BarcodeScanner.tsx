import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (error: any) => void;
}

export function BarcodeScanner({ onScan, onError }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  
  useEffect(() => {
    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      supportedScanTypes: [] // uses default which is all
    };
    
    const scanner = new Html5QrcodeScanner(
      "barcode-scanner-reader",
      config,
      false
    );
    
    scannerRef.current = scanner;

    // Use a small timeout to let the DOM settle, as it needs the div to exist
    setTimeout(() => {
      scanner.render(
        (decodedText) => {
          onScan(decodedText);
        },
        (error) => {
          if (onError) onError(error);
        }
      );
      setIsInitializing(false);
    }, 100);

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [onScan, onError]);

  return (
    <div className="w-full relative min-h-[300px] flex flex-col items-center">
      {isInitializing && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/50">
          <p className="text-sm text-muted-foreground animate-pulse">Initializing camera...</p>
        </div>
      )}
      <div id="barcode-scanner-reader" className="w-full max-w-[400px] overflow-hidden rounded-md border" />
      <style>{`
        #barcode-scanner-reader {
          border: none !important;
        }
        #barcode-scanner-reader img {
          display: none;
        }
        #barcode-scanner-reader button {
          padding: 8px 16px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          background: white;
          color: #0f172a;
          font-weight: 500;
          cursor: pointer;
          margin-top: 10px;
          margin-bottom: 10px;
        }
        #barcode-scanner-reader select {
          padding: 8px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          margin-bottom: 10px;
          width: 100%;
        }
        #barcode-scanner-reader a {
          display: none;
        }
      `}</style>
    </div>
  );
}
