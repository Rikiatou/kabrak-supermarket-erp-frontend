"use client";

import { useState, useRef, useEffect } from "react";
import {
  ScanLine,
  Camera,
  CameraOff,
  Check,
  X,
  Package,
  Search,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/context";
import { useToast } from "@/components/ui/Toast";
import { useServerProductSearch } from "@/lib/hooks/useApi";
import { formatCurrency, cn } from "@/lib/utils";

interface ScannedItem {
  productId: string;
  name: string;
  barcode: string;
  stock: number;
  counted: number;
  difference: number;
  costPrice: number;
  scannedAt: string;
}

export default function ScannerPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  // Recherche server-side: cherche parmi TOUS les produits (18000+), pas seulement 50
  const { results: searchResults, search: serverSearch, scanBarcode: serverScanBarcode } = useServerProductSearch();

  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState<ScannedItem[]>([]);
  const [manualSearch, setManualSearch] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Démarrer la caméra
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setScanning(true);
      toast(t.scanner.cameraEnabled, "info");
    } catch (err) {
      toast(t.scanner.cameraError, "warning");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Recherche manuelle par code-barres — cherche côté serveur (barcode + SKU, tous les produits)
  const handleManualScan = async () => {
    if (!manualSearch.trim()) return;
    const product = await serverScanBarcode(manualSearch.trim());
    if (product) {
      addScannedItem(product);
      setManualSearch("");
    } else {
      toast(`${t.scanner.noProductFound} "${manualSearch}"`, "warning");
    }
  };

  const addScannedItem = (product: any) => {
    const existing = scanned.find((s) => s.productId === product.id);
    if (existing) {
      setScanned(scanned.map((s) =>
        s.productId === product.id
          ? { ...s, counted: s.counted + 1, difference: s.counted + 1 - s.stock }
          : s
      ));
    } else {
      setScanned([
        {
          productId: product.id,
          name: product.name,
          barcode: product.barcode,
          stock: product.stock,
          counted: 1,
          difference: 1 - product.stock,
          costPrice: product.costPrice || 0,
          scannedAt: new Date().toISOString(),
        },
        ...scanned,
      ]);
    }
    toast(`${product.name} ${t.scanner.productScanned}`, "success");
  };

  const updateCount = (productId: string, count: number) => {
    setScanned(scanned.map((s) =>
      s.productId === productId ? { ...s, counted: count, difference: count - s.stock } : s
    ));
  };

  const removeScanned = (productId: string) => {
    setScanned(scanned.filter((s) => s.productId !== productId));
  };

  const totalScanned = scanned.length;
  const totalDiscrepancies = scanned.filter((s) => s.difference !== 0).length;
  const totalValue = scanned.reduce((sum, s) => sum + Math.abs(s.difference) * (s.costPrice || 0), 0);

  // Recherche server-side déclenchée à chaque changement du champ manuel
  useEffect(() => {
    if (manualSearch.trim()) serverSearch(manualSearch);
  }, [manualSearch, serverSearch]);

  const filteredProducts = manualSearch.trim() ? searchResults.slice(0, 5) : [];

  return (
    <AppShell title={t.scanner.title} subtitle={t.scanner.subtitle}>
      <div className="space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <ScanLine className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">{t.scanner.scannedItems}</p>
                <p className="text-lg font-bold text-[var(--text-primary)] tabular-nums">{totalScanned}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">{t.scanner.discrepancies}</p>
                <p className="text-lg font-bold text-[var(--text-primary)] tabular-nums">{totalDiscrepancies}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                <Package className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">{t.scanner.discrepancyValue}</p>
                <p className="text-lg font-bold text-[var(--text-primary)] tabular-nums">{formatCurrency(totalValue)}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Camera section */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t.scanner.cameraScanner}</h3>
              <Button
                size="sm"
                variant={scanning ? "secondary" : "primary"}
                icon={scanning ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                onClick={scanning ? stopCamera : startCamera}
              >
                {scanning ? t.scanner.stop : t.scanner.start}
              </Button>
            </div>

            {scanning ? (
              <div className="relative bg-black rounded-xl overflow-hidden aspect-square">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {/* Scan overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-2 border-green-400 rounded-xl shadow-2xl">
                    <div className="w-full h-0.5 bg-green-400 animate-pulse" style={{ marginTop: "50%" }} />
                  </div>
                </div>
                <p className="absolute bottom-3 left-3 text-white text-xs bg-black/50 px-2 py-1 rounded">
                  {t.scanner.pointCamera}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center aspect-square bg-slate-50 rounded-xl border-2 border-dashed border-[var(--border)]">
                <Camera className="w-12 h-12 text-[var(--text-muted)] mb-3" />
                <p className="text-sm text-[var(--text-secondary)]">{t.scanner.cameraDisabled}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">{t.scanner.cameraStartHint}</p>
              </div>
            )}

            {/* Manual search */}
            <div className="mt-3">
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">
                {t.scanner.manualSearch}
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={manualSearch}
                    onChange={(e) => setManualSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleManualScan()}
                    placeholder={t.scanner.manualSearchPh}
                    className="w-full pl-9 pr-3 py-2.5 border border-[var(--border)] rounded-xl text-sm outline-none focus:border-[var(--brand)]"
                  />
                </div>
                <Button onClick={handleManualScan} icon={<ScanLine className="w-4 h-4" />}>
                  {t.scanner.scan}
                </Button>
              </div>
              {filteredProducts.length > 0 && (
                <div className="mt-1.5 border border-[var(--border)] rounded-xl divide-y divide-[var(--border-subtle)]">
                  {filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        addScannedItem(p);
                        setManualSearch("");
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-[var(--surface-hover)] text-sm flex justify-between"
                    >
                      <span className="font-medium">{p.name}</span>
                      <span className="text-xs text-[var(--text-muted)]">{p.barcode}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Scanned items */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t.scanner.scannedCount} ({scanned.length})</h3>
              {scanned.length > 0 && (
                <button
                  onClick={() => setScanned([])}
                  className="text-xs text-red-500 hover:underline"
                >
                  {t.scanner.clearAll}
                </button>
              )}
            </div>

            {scanned.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
                <Package className="w-10 h-10 mb-3 opacity-20" />
                <p className="text-sm">{t.scanner.noItemsScanned}</p>
                <p className="text-xs mt-1">{t.scanner.scanToStart}</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {scanned.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.name}</p>
                      <p className="text-xs text-[var(--text-muted)] font-mono">{item.barcode}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-[var(--text-muted)]">{t.scanner.stock} {item.stock}</span>
                        <span className={cn(
                          "text-xs font-medium",
                          item.difference === 0 ? "text-emerald-600" : item.difference > 0 ? "text-blue-600" : "text-red-600"
                        )}>
                          {t.scanner.difference}: {item.difference > 0 ? "+" : ""}{item.difference}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => updateCount(item.productId, Math.max(0, item.counted - 1))}
                        className="w-7 h-7 rounded-lg bg-white border border-[var(--border)] flex items-center justify-center hover:bg-slate-100"
                      >
                        <X className="w-3 h-3 rotate-45" />
                      </button>
                      <input
                        type="number"
                        value={item.counted}
                        onChange={(e) => updateCount(item.productId, parseInt(e.target.value) || 0)}
                        className="w-14 text-center text-sm font-bold border border-[var(--border)] rounded-lg py-1 tabular-nums"
                      />
                      <button
                        onClick={() => updateCount(item.productId, item.counted + 1)}
                        className="w-7 h-7 rounded-lg bg-white border border-[var(--border)] flex items-center justify-center hover:bg-slate-100"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {scanned.length > 0 && (
              <div className="mt-3 pt-3 border-t border-[var(--border)]">
                <Button className="w-full" icon={<RefreshCw className="w-4 h-4" />}>
                  {t.scanner.validateInventory} ({scanned.length} {t.scanner.articlesLabel})
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
