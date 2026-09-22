import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Button } from "@/components/ui/button";


interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (error: any) => void;
}

export function BarcodeScanner({ onScan, onError }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  
  useEffect(() => {
    let scanner: Html5Qrcode;
    let isMounted = true;

    setTimeout(() => {
      if (!isMounted) return;
      
      // Initialize with all formats explicitly, especially 1D barcodes
      scanner = new Html5Qrcode("barcode-scanner-reader", {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.CODABAR,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ],
        verbose: false
      });
      scannerRef.current = scanner;

      scanner.start(
        // Request high resolution and rear camera
        { 
          facingMode: "environment",
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
        }, 
        {
          fps: 10,
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

  const handleZoom = (level: number) => {
    setZoomLevel(level);
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        scannerRef.current.applyVideoConstraints({
          advanced: [{ zoom: level } as any]
        });
      } catch (err) {
        console.warn("Hardware zoom not supported by this browser/device, using digital fallback", err);
      }
    }
  };

  return (
    <div className="w-full relative min-h-[300px] flex flex-col items-center justify-center bg-black overflow-hidden group">
      {isInitializing && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/50">
          <p className="text-sm text-muted-foreground animate-pulse">Initializing rear camera...</p>
        </div>
      )}
      
      {/* Zoom controls overlaid on camera */}
      {!isInitializing && (
        <div className="absolute top-2 right-2 z-20 flex flex-col gap-2 bg-black/40 p-2 rounded-md backdrop-blur-sm">
          <Button 
            size="sm" 
            variant={zoomLevel === 1 ? "default" : "secondary"} 
            className="h-8 w-12 text-xs" 
            onClick={() => handleZoom(1)}
          >
            1x
          </Button>
          <Button 
            size="sm" 
            variant={zoomLevel === 1.5 ? "default" : "secondary"} 
            className="h-8 w-12 text-xs" 
            onClick={() => handleZoom(1.5)}
          >
            1.5x
          </Button>
          <Button 
            size="sm" 
            variant={zoomLevel === 2 ? "default" : "secondary"} 
            className="h-8 w-12 text-xs" 
            onClick={() => handleZoom(2)}
          >
            2x
          </Button>
        </div>
      )}

      {/* Digital zoom fallback via CSS transform if hardware zoom fails or isn't supported */}
      <div 
        id="barcode-scanner-reader" 
        className="w-full max-w-[400px] overflow-hidden rounded-md border-none transition-transform duration-200"
        style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
      />
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
