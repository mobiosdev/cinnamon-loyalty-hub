import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw, AlertTriangle, Loader2 } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "sonner";

interface QrScannerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

export const QrScannerDialog = ({ isOpen, onClose, onScanSuccess }: QrScannerDialogProps) => {
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const qrCodeInstanceRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "qr-reader-container";

  // Scan success flag to prevent double-scanning/multiple rapid scans
  const scanProcessedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      cleanupScanner();
      return;
    }

    scanProcessedRef.current = false;
    setLoading(true);
    setErrorMessage(null);

    // Give the dialog DOM a tiny moment to fully mount the container div
    const timer = setTimeout(() => {
      initializeScanner();
    }, 200);

    return () => {
      clearTimeout(timer);
      cleanupScanner();
    };
  }, [isOpen]);

  const initializeScanner = async () => {
    try {
      // Create new instance of Html5Qrcode
      const html5QrCode = new Html5Qrcode(scannerContainerId);
      qrCodeInstanceRef.current = html5QrCode;

      // Get available cameras
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        throw new Error("No cameras found on your device.");
      }

      setCameras(devices);

      // Select default camera (prefer back camera/environment if possible)
      let selectedCamera = devices[0];
      const backCamera = devices.find((device) => 
        device.label.toLowerCase().includes("back") || 
        device.label.toLowerCase().includes("environment") || 
        device.label.toLowerCase().includes("rear")
      );
      if (backCamera) {
        selectedCamera = backCamera;
      }

      setActiveCameraId(selectedCamera.id);
      await startScanning(html5QrCode, selectedCamera.id);
    } catch (err: any) {
      console.error("Scanner initialization failed:", err);
      setErrorMessage(err.message || "Failed to initialize scanner. Please check camera permissions.");
      setLoading(false);
    }
  };

  const startScanning = async (scannerInstance: Html5Qrcode, cameraId: string) => {
    setLoading(true);
    try {
      // If already scanning, stop it first
      if (scannerInstance.isScanning) {
        await scannerInstance.stop();
      }

      await scannerInstance.start(
        cameraId,
        {
          fps: 10,
          qrbox: (width, height) => {
            const size = Math.min(width, height) * 0.7;
            return { width: size, height: size };
          },
        },
        (decodedText) => {
          if (scanProcessedRef.current) return;
          scanProcessedRef.current = true;
          
          toast.success("QR Code scanned successfully!");
          onScanSuccess(decodedText);
          onClose();
        },
        () => {
          // Verbose error/no QR code detected in frame - keep silent
        }
      );
      setLoading(false);
    } catch (err: any) {
      console.error("Failed to start scanning:", err);
      setErrorMessage("Could not start camera stream. Ensure camera is not used by another app.");
      setLoading(false);
    }
  };

  const switchCamera = async () => {
    if (cameras.length <= 1 || !qrCodeInstanceRef.current) return;
    
    const currentIndex = cameras.findIndex((c) => c.id === activeCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];
    
    setActiveCameraId(nextCamera.id);
    await startScanning(qrCodeInstanceRef.current, nextCamera.id);
  };

  const cleanupScanner = () => {
    if (qrCodeInstanceRef.current) {
      if (qrCodeInstanceRef.current.isScanning) {
        qrCodeInstanceRef.current.stop()
          .then(() => {
            console.log("Scanner stopped successfully");
          })
          .catch((err) => {
            console.error("Error stopping scanner:", err);
          });
      }
      qrCodeInstanceRef.current = null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px] p-6 bg-background border border-border rounded-xl shadow-2xl">
        <DialogHeader className="mb-4">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Camera className="h-5 w-5 text-primary" />
            Scan Member QR Code
          </DialogTitle>
          <DialogDescription>
            Position the member's QR code within the highlighted frame to scan automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-square w-full max-w-[340px] mx-auto overflow-hidden rounded-lg bg-black border border-border flex flex-col items-center justify-center">
          {/* Custom style for CSS scan animation */}
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes scan-animation {
              0% { top: 15%; }
              50% { top: 85%; }
              100% { top: 15%; }
            }
          `}} />

          {/* Scanner view container */}
          <div id={scannerContainerId} className="w-full h-full [&_video]:object-cover [&_video]:w-full [&_video]:h-full" />

          {/* Scanner Overlay when camera is active */}
          {!loading && !errorMessage && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              {/* Laser line animation */}
              <div 
                className="absolute left-[15%] right-[15%] h-0.5 bg-primary/80 shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                style={{ animation: 'scan-animation 2.5s linear infinite' }}
              />
              
              {/* Camera Frame corners design */}
              <div className="absolute w-[70%] h-[70%] border border-dashed border-white/20 rounded-md">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary" />
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && !errorMessage && (
            <div className="absolute inset-0 bg-background/90 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <p className="text-sm font-medium text-muted-foreground">Accessing camera...</p>
            </div>
          )}

          {/* Error state */}
          {errorMessage && (
            <div className="absolute inset-0 bg-background flex flex-col items-center justify-center p-6 text-center gap-3">
              <AlertTriangle className="h-12 w-12 text-destructive" />
              <h3 className="font-semibold text-foreground">Camera Access Failed</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{errorMessage}</p>
              <Button size="sm" onClick={initializeScanner} className="mt-2">
                Retry Connection
              </Button>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="mt-6 flex items-center justify-between gap-4">
          <Button variant="ghost" onClick={onClose} size="sm">
            Cancel
          </Button>

          {cameras.length > 1 && !errorMessage && !loading && (
            <Button variant="outline" size="sm" onClick={switchCamera} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Switch Camera
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
