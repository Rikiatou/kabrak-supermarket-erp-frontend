"use client";

import { useState } from "react";
import { Download, FileText, Check } from "lucide-react";
import jsPDF from "jspdf";

export default function PropositionPage() {
  const [generating, setGenerating] = useState(false);

  const generatePDF = () => {
    setGenerating(true);
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;

    // ── Header bar ──
    pdf.setFillColor(15, 23, 42); // #0f172a
    pdf.rect(0, 0, pageWidth, 35, "F");

    // Logo placeholder (text-based since we can't load image easily)
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(22);
    pdf.setFont("helvetica", "bold");
    pdf.text("KABRAK", margin, 18);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(148, 163, 184);
    pdf.text("Retail Management Solutions", margin, 24);
    pdf.text("contact@kabrak.cm  |  +237 6 XX XXX XXX", margin, 29);

    // Document title
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.text("PROPOSITION COMMERCIALE", pageWidth - margin - 45, 18);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text(`Ref: PROP-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`, pageWidth - margin - 45, 24);
    pdf.text(`Date: ${new Date().toLocaleDateString("fr-FR")}`, pageWidth - margin - 45, 29);

    // ── Introduction ──
    let y = 48;
    pdf.setTextColor(30, 41, 59);
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("Solution de Gestion pour Supermarche", margin, y);

    y += 8;
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(80, 80, 80);
    const intro = [
      "KABRAK Retail ERP est une solution complete de gestion destinee aux supermarches,",
      "boutiques et commerces de detail. Elle combine un systeme de point de vente (POS),",
      "une gestion de stock en temps reel, la facturation, les rapports et le suivi des equipes.",
      "",
      "Notre solution fonctionne en mode hybride: installation locale (hors-ligne) +",
      "synchronisation cloud. Vos donnees sont toujours disponibles, meme sans internet.",
    ];
    intro.forEach((line) => {
      pdf.text(line, margin, y);
      y += 5;
    });

    // ── Section 1: Modules inclus ──
    y += 6;
    pdf.setFillColor(30, 64, 175);
    pdf.roundedRect(margin, y, contentWidth, 8, 1.5, 1.5, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("MODULES INCLUS", margin + 4, y + 5.5);
    y += 14;

    const modules = [
      ["Point de Vente (POS)", "Caisse rapide, scanner, multi-paiements (especes, carte, mobile)"],
      ["Gestion de Stock", "Stock en temps reel, alertes seuil, historique mouvements"],
      ["Achats & Fournisseurs", "Bons de commande, bons de livraison, reception automatique"],
      ["Facturation", "Factures clients, suivi paiements, export PDF, QR code"],
      ["Rapports & Analytics", "Ventes, benefices, top produits, tendances, valorisation stock"],
      ["Comptabilite", "Depenses, revenus, compte de resultat, monthly summary"],
      ["Gestion Equipe", "Employes, roles (Boss, Compta, Caisseur, Stock), plannings"],
      ["Gestion Caisses", "Ouverture/fermeture, fonds de caisse, ecarts, historique"],
      ["Historique Produits", "Suivi complet: ventes, receptions, ajustements, pertes"],
      ["Mode Hors-ligne", "Fonctionnement sans internet + sync automatique au retour"],
      ["Multi-langue", "Francais et Anglais"],
      ["Sauvegardes Cloud", "Donnees protegees, sauvegarde automatique quotidienne"],
    ];

    pdf.setFontSize(9);
    modules.forEach((mod, i) => {
      if (y > pageHeight - 30) {
        pdf.addPage();
        y = margin;
      }
      // Check icon
      pdf.setTextColor(22, 163, 74);
      pdf.setFont("helvetica", "bold");
      pdf.text("\u2713", margin, y);
      // Module name
      pdf.setTextColor(30, 41, 59);
      pdf.setFont("helvetica", "bold");
      pdf.text(mod[0], margin + 6, y);
      // Description
      pdf.setTextColor(100, 116, 139);
      pdf.setFont("helvetica", "normal");
      pdf.text(mod[1], margin + 6, y + 4.5);
      y += 9;
    });

    // ── Section 2: Tarifs ──
    if (y > pageHeight - 80) {
      pdf.addPage();
      y = margin;
    }
    y += 6;
    pdf.setFillColor(30, 64, 175);
    pdf.roundedRect(margin, y, contentWidth, 8, 1.5, 1.5, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("TARIFICATION", margin + 4, y + 5.5);
    y += 14;

    // License table
    const tableY = y;
    const col1 = margin;
    const col2 = margin + 90;
    const col3 = margin + 140;

    // Header
    pdf.setFillColor(241, 245, 249);
    pdf.rect(margin, tableY, contentWidth, 8, "F");
    pdf.setTextColor(30, 41, 59);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    pdf.text("SERVICE", col1 + 4, tableY + 5.5);
    pdf.text("DUREE", col2, tableY + 5.5);
    pdf.text("PRIX (FCFA)", col3, tableY + 5.5);

    y = tableY + 8;

    const rows = [
      ["License Standard", "Mensuel", "25 000 / mois"],
      ["License Standard", "Annuel", "300 000 / an"],
      ["License Standard", "6 mois", "165 000 (27 500/mois)"],
      ["License Multi-Store", "Annuel", "Sur devis (des 600 000/an)"],
    ];

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    rows.forEach((row, i) => {
      const bg = i % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
      pdf.setFillColor(bg[0], bg[1], bg[2]);
      pdf.rect(margin, y, contentWidth, 7, "F");
      pdf.setTextColor(30, 41, 59);
      pdf.text(row[0], col1 + 4, y + 5);
      pdf.setTextColor(100, 116, 139);
      pdf.text(row[1], col2, y + 5);
      pdf.setTextColor(30, 41, 59);
      pdf.setFont("helvetica", "bold");
      pdf.text(row[2], col3, y + 5);
      pdf.setFont("helvetica", "normal");
      y += 7;
    });

    // Border
    pdf.setDrawColor(220, 220, 220);
    pdf.rect(margin, tableY, contentWidth, y - tableY);

    // ── Section 3: Frais de demarrage ──
    y += 10;
    pdf.setFillColor(30, 64, 175);
    pdf.roundedRect(margin, y, contentWidth, 8, 1.5, 1.5, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("FRAIS DE DEMARRAGE (ONE-TIME)", margin + 4, y + 5.5);
    y += 14;

    const startupRows = [
      ["Installation hybride (locale + cloud)", "75 000"],
      ["Formation equipe (caissier + stock + admin)", "25 000"],
    ];

    pdf.setFontSize(9);
    startupRows.forEach((row, i) => {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(margin, y, contentWidth, 8, "F");
      pdf.setTextColor(30, 41, 59);
      pdf.setFont("helvetica", "normal");
      pdf.text(row[0], col1 + 4, y + 5.5);
      pdf.setFont("helvetica", "bold");
      pdf.text(`${row[1]} FCFA`, col3, y + 5.5);
      y += 8;
    });

    // Total
    pdf.setFillColor(30, 64, 175);
    pdf.rect(margin, y, contentWidth, 9, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text("TOTAL DEMARRAGE", col1 + 4, y + 6);
    pdf.text("100 000 FCFA", col3, y + 6);
    y += 15;

    // ── Section 4: Ce qui est inclus dans la license ──
    y += 4;
    pdf.setFillColor(236, 253, 245); // green-50
    pdf.roundedRect(margin, y, contentWidth, 8, 1.5, 1.5, "F");
    pdf.setTextColor(6, 95, 70);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("INCLUS DANS LA LICENSE (sans frais supplementaires)", margin + 4, y + 5.5);
    y += 14;

    const included = [
      "Mises a jour du logiciel (nouvelles fonctionnalites)",
      "Support technique par email et telephone",
      "Sauvegardes cloud automatiques",
      "Synchronisation hors-ligne / cloud",
      "Hebergement cloud (serveur + base de donnees)",
      "Corrections de bugs et securite",
    ];

    pdf.setFontSize(8.5);
    included.forEach((item) => {
      pdf.setTextColor(22, 163, 74);
      pdf.setFont("helvetica", "bold");
      pdf.text("\u2713", margin, y);
      pdf.setTextColor(60, 60, 60);
      pdf.setFont("helvetica", "normal");
      pdf.text(item, margin + 6, y);
      y += 5.5;
    });

    // ── Section 5: Pourquoi le mode hybride ──
    y += 8;
    if (y > pageHeight - 40) {
      pdf.addPage();
      y = margin;
    }
    pdf.setFillColor(30, 64, 175);
    pdf.roundedRect(margin, y, contentWidth, 8, 1.5, 1.5, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("POURQUOI LE MODE HYBRIDE?", margin + 4, y + 5.5);
    y += 14;

    const hybrid = [
      "Fonctionnement 100% local: votre caisse marche meme sans internet",
      "Synchronisation cloud: vos donnees accessibles partout, sur telephone et PC",
      "Securite: double stockage (local + cloud), pas de perte de donnees",
      "Performance: pas de latence reseau a la caisse",
      "Accessibilite: consultez vos rapports depuis chez vous sur mobile",
    ];

    pdf.setFontSize(8.5);
    hybrid.forEach((item) => {
      pdf.setTextColor(30, 64, 175);
      pdf.setFont("helvetica", "bold");
      pdf.text("\u2022", margin, y);
      pdf.setTextColor(60, 60, 60);
      pdf.setFont("helvetica", "normal");
      pdf.text(item, margin + 6, y);
      y += 5.5;
    });

    // ── Footer ──
    y = pageHeight - 25;
    pdf.setDrawColor(220, 220, 220);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 5;
    pdf.setTextColor(100, 116, 139);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.text("KABRAK Retail  |  contact@kabrak.cm  |  +237 6 XX XXX XXX", margin, y);
    pdf.text("Proposition valable 30 jours", pageWidth - margin - 40, y);
    y += 4;
    pdf.text("Powered by KABRAK Engineering", margin, y);

    pdf.save("KABRAK_Proposition_Commerciale.pdf");
    setGenerating(false);
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="/kabrak-logo.jpeg"
            alt="KABRAK"
            className="w-16 h-16 rounded-2xl object-cover mx-auto shadow-md mb-3"
          />
          <h1 className="text-xl font-bold text-neutral-900">Proposition Commerciale</h1>
          <p className="text-sm text-neutral-500 mt-1">KABRAK Retail ERP</p>
        </div>

        {/* Summary card */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-5 space-y-4 mb-4">
          <div className="flex items-center gap-2 text-neutral-900 font-semibold text-sm">
            <FileText className="w-4 h-4" />
            Resume de l'offre
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">License (mensuel)</span>
              <span className="font-semibold">25 000 FCFA/mois</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">License (annuel)</span>
              <span className="font-semibold">300 000 FCFA/an</span>
            </div>
            <div className="border-t border-neutral-100 pt-2 mt-2">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Installation hybride</span>
                <span className="font-semibold">75 000 FCFA</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Formation</span>
                <span className="font-semibold">25 000 FCFA</span>
              </div>
            </div>
            <div className="flex justify-between text-base font-bold pt-2 border-t border-neutral-200">
              <span>Total demarrage</span>
              <span className="text-blue-700">100 000 FCFA</span>
            </div>
          </div>

          <div className="bg-emerald-50 rounded-xl p-3 space-y-1">
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Inclus dans la license</p>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600">
              <Check className="w-3 h-3" /> Mises a jour + Support
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600">
              <Check className="w-3 h-3" /> Sauvegardes cloud + Hebergement
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600">
              <Check className="w-3 h-3" /> Sync hors-ligne + Securite
            </div>
          </div>
        </div>

        {/* Download button */}
        <button
          onClick={generatePDF}
          disabled={generating}
          className="w-full bg-neutral-900 text-white py-3.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:bg-neutral-800 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {generating ? "Generation en cours..." : "Telecharger le PDF"}
        </button>

        <p className="text-center text-xs text-neutral-400 mt-4">
          Document professionnel avec tous les details et tarifs
        </p>
      </div>
    </div>
  );
}
