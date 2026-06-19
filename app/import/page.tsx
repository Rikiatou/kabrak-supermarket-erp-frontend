"use client";

import { useState, useRef } from "react";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Download,
  Loader2,
  X,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useI18n } from "@/lib/i18n/context";
import { useToast } from "@/components/ui/Toast";
import { productsApi } from "@/lib/api";

interface ImportResult {
  total: number;
  success: number;
  errors: number;
  errorDetails: Array<{ row: number; error: string }>;
  duration: number;
}

export default function ImportPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast("Veuillez sélectionner un fichier CSV", "warning");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvText(text);
      toast(`Fichier chargé: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, "success");
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImport = async () => {
    if (!csvText) {
      toast("Veuillez d'abord charger un fichier CSV", "warning");
      return;
    }

    setImporting(true);
    setResult(null);

    try {
      const res = await productsApi.importCsv(csvText);
      setResult({
        total: res.total,
        success: res.success,
        errors: res.errors,
        duration: res.duration,
        errorDetails: [],
      });

      if (res.errors === 0) {
        toast(`${res.success} produits importés en ${(res.duration / 1000).toFixed(1)}s`, "success");
      } else {
        toast(`${res.success} réussis, ${res.errors} erreurs sur ${res.total}`, "warning");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur d'import";
      toast(`Erreur d'import: ${msg}`, "warning");
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const template = `sku,barcode,name,category,subCategory,brand,price,costPrice,stock,minStock,unit,expiryDate,imageUrl
HV-5L-001,0620012345678,Huile Végétale 5L,Épicerie,Huiles,SCTB,5500,4100,50,20,bouteille,,
EM-1.5-003,0610098765432,Eau Minérale 1.5L,Boissons,Eaux,SABC,400,250,200,50,bouteille,,
RIZ-25-002,0640055667788,Riz Parfumé 25kg,Épicerie,Riz,Import Asie,22000,17500,42,15,sac,,`;

    const blob = new Blob([template], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kabrak-products-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setCsvText("");
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <AppShell
      title="Import de Produits"
      subtitle="Importez en masse vos produits depuis un fichier CSV"
    >
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Instructions */}
        <Card padding="md">
          <CardHeader
            title="Format CSV requis"
            subtitle="Votre fichier doit contenir ces colonnes (les colonnes en gras sont obligatoires)"
          />
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
            {[
              { name: "sku", required: true, desc: "Référence unique" },
              { name: "barcode", required: true, desc: "Code-barres" },
              { name: "name", required: true, desc: "Nom du produit" },
              { name: "category", required: true, desc: "Catégorie" },
              { name: "price", required: true, desc: "Prix en FCFA" },
              { name: "stock", required: true, desc: "Stock actuel" },
              { name: "costPrice", required: false, desc: "Prix d'achat" },
              { name: "minStock", required: false, desc: "Stock min (défaut: 10)" },
              { name: "unit", required: false, desc: "Unité (défaut: pièce)" },
              { name: "expiryDate", required: false, desc: "YYYY-MM-DD" },
              { name: "brand", required: false, desc: "Marque" },
              { name: "imageUrl", required: false, desc: "URL image" },
            ].map((col) => (
              <div
                key={col.name}
                className="flex items-center gap-2 bg-[var(--background)] rounded-lg px-3 py-2"
              >
                <code className="text-xs font-mono text-[var(--text-primary)]">{col.name}</code>
                {col.required && (
                  <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">
                    requis
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={downloadTemplate}
            >
              Télécharger le template
            </Button>
          </div>
        </Card>

        {/* Upload zone */}
        <Card padding="md">
          <CardHeader
            title="Charger votre fichier CSV"
            subtitle="Glissez-déposez votre fichier ou cliquez pour parcourir"
          />

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={cn(
              "mt-4 border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all",
              dragOver
                ? "border-[var(--brand)] bg-[var(--brand-light)]"
                : "border-[var(--border)] hover:border-blue-300 hover:bg-[var(--surface-hover)]"
            )}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            {csvText ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Fichier chargé
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {csvText.split("\n").length - 1} lignes détectées
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    reset();
                  }}
                  className="mt-2 text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Retirer
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-10 h-10 text-[var(--text-muted)]" />
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Cliquez ou glissez votre CSV ici
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  Format: .csv (jusqu'à 50 000 produits)
                </p>
              </div>
            )}
          </div>

          {/* Import button */}
          {csvText && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Prêt à importer {csvText.split("\n").length - 1} produits
              </div>
              <Button
                onClick={handleImport}
                disabled={importing}
                icon={
                  importing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )
                }
              >
                {importing ? "Import en cours..." : "Lancer l'import"}
              </Button>
            </div>
          )}
        </Card>

        {/* Results */}
        {result && (
          <Card padding="md">
            <CardHeader
              title="Résultats de l'import"
              subtitle={`Terminé en ${(result.duration / 1000).toFixed(1)} secondes`}
            />
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="bg-emerald-50 rounded-xl p-4 text-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-emerald-600">{result.success}</p>
                <p className="text-xs text-emerald-700">Réussis</p>
              </div>
              <div className="bg-red-50 rounded-xl p-4 text-center">
                <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-red-600">{result.errors}</p>
                <p className="text-xs text-red-700">Erreurs</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <FileText className="w-6 h-6 text-blue-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-blue-600">{result.total}</p>
                <p className="text-xs text-blue-700">Total</p>
              </div>
            </div>

            {/* Error details */}
            {result.errorDetails.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">
                  Détails des erreurs ({result.errorDetails.length} affichés):
                </p>
                <div className="max-h-48 overflow-y-auto bg-[var(--background)] rounded-xl p-3 space-y-1">
                  {result.errorDetails.map((err, i) => (
                    <div key={i} className="text-xs flex items-start gap-2">
                      <Badge variant="danger" size="sm">Ligne {err.row}</Badge>
                      <span className="text-[var(--text-secondary)]">{err.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.errors === 0 && (
              <div className="mt-4 bg-emerald-50 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <p className="text-sm text-emerald-700">
                  Tous les {result.success} produits ont été importés avec succès!
                </p>
              </div>
            )}
          </Card>
        )}
      </div>
    </AppShell>
  );
}

// Helper
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
