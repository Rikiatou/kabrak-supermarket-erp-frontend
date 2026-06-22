"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { X, Camera, AlertCircle, Loader2 } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
  result?: { code: string; status: "success" | "not_found" | "out_of_stock" } | null;
}

export function BarcodeScanner({ onScan, onClose, result }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(true);
  const lastScanRef = useRef<{ code: string; time: number } | null>(null);

  useEffect(() => {
    let mounted = true;

    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.QR_CODE,
    ]);

    const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 200 });

    (async () => {
      try {
        // Demander la caméra arrière (ou la première disponible)
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const backCam = devices.find((d) => /back|rear|environment/i.test(d.label)) || devices[0];

        if (!videoRef.current) return;

        const controls = await reader.decodeFromVideoDevice(
          backCam?.deviceId || undefined,
          videoRef.current,
          (result) => {
            if (!result || !mounted) return;
            const code = result.getText();
            const now = Date.now();

            // Éviter les doublons : même code dans les 2 secondes
            const last = lastScanRef.current;
            if (last && last.code === code && now - last.time < 2000) return;

            lastScanRef.current = { code, time: now };
            onScan(code);
          }
        );
        controlsRef.current = controls;
        if (mounted) setStarting(false);
      } catch (e: any) {
        if (mounted) {
          setStarting(false);
          setError(e?.message || "Cannot access camera");
        }
      }
    })();

    return () => {
      mounted = false;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[300] bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/80">
        <div className="flex items-center gap-2 text-white">
          <Camera className="w-5 h-5" />
          <span className="font-semibold text-sm">Scanner code-barres</span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-white hover:bg-white/10 transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Video */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
        />

        {/* Cadre de scan */}
        {!error && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-40 border-2 border-white/70 rounded-2xl relative">
              {/* Lignes de coin */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />
              {/* Ligne de scan animée */}
              <div className="absolute left-2 right-2 top-1/2 h-0.5 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
            </div>
          </div>
        )}

        {/* Loading */}
        {starting && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
            <p className="text-white text-sm">Starting camera...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-400" />
            <p className="text-white font-semibold">Camera unavailable</p>
            <p className="text-white/60 text-sm max-w-xs">{error}</p>
            <p className="text-white/40 text-xs mt-2">
              Check browser permissions and use HTTPS
            </p>
          </div>
        )}

        {/* Feedback dernier scan */}
        {result && !error && (
          <div className={
            "absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-semibold shadow-lg animate-fade-in " +
            (result.status === "success"
              ? "bg-emerald-500/90 text-white"
              : result.status === "out_of_stock"
              ? "bg-amber-500/90 text-white"
              : "bg-red-500/90 text-white")
          }>
            {result.status === "success"
              ? "✓ " + result.code
              : result.status === "out_of_stock"
              ? "Out of stock: " + result.code
              : "Not found: " + result.code}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 bg-black/80 text-center">
        <p className="text-white/60 text-xs">
          Point the camera at a barcode · EAN-13, EAN-8, UPC, Code128, QR
        </p>
      </div>
    </div>
  );
}
