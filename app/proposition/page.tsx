"use client";

import { useState } from "react";
import { Download, FileText, Check } from "lucide-react";
import jsPDF from "jspdf";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

export default function PropositionPage() {
  const [generating, setGenerating] = useState(false);
  const { locale, setLocale, t } = useI18n();
  const p = t.proposition;

  const generatePDF = () => {
    setGenerating(true);
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;

    // ── Header bar ──
    pdf.setFillColor(15, 23, 42);
    pdf.rect(0, 0, pageWidth, 35, "F");

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(22);
    pdf.setFont("helvetica", "bold");
    pdf.text("KABRAK", margin, 18);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(148, 163, 184);
    pdf.text("Retail Management Solutions", margin, 24);
    pdf.text("contact@kabrak.cm  |  +237 6 XX XXX XXX", margin, 29);

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.text(p.pdfTitle, pageWidth - margin - 55, 18);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    const refText = `${p.pdfRef}: PROP-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    pdf.text(refText, pageWidth - margin - 55, 24);
    pdf.text(`${p.pdfDate}: ${new Date().toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB")}`, pageWidth - margin - 55, 29);

    // ── Introduction ──
    let y = 48;
    pdf.setTextColor(30, 41, 59);
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text(p.pdfIntroTitle, margin, y);

    y += 8;
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(80, 80, 80);
    [p.intro1, p.intro2, p.intro3, p.intro4, p.intro5, p.intro6].forEach((line) => {
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
    pdf.text(p.pdfModulesTitle, margin + 4, y + 5.5);
    y += 14;

    const modules = [
      [p.modPos, p.modPosDesc],
      [p.modStock, p.modStockDesc],
      [p.modPurchases, p.modPurchasesDesc],
      [p.modInvoicing, p.modInvoicingDesc],
      [p.modReports, p.modReportsDesc],
      [p.modAccounting, p.modAccountingDesc],
      [p.modTeam, p.modTeamDesc],
      [p.modRegisters, p.modRegistersDesc],
      [p.modHistory, p.modHistoryDesc],
      [p.modOffline, p.modOfflineDesc],
      [p.modI18n, p.modI18nDesc],
      [p.modBackup, p.modBackupDesc],
    ];

    pdf.setFontSize(9);
    modules.forEach((mod) => {
      if (y > pageHeight - 30) {
        pdf.addPage();
        y = margin;
      }
      pdf.setTextColor(22, 163, 74);
      pdf.setFont("helvetica", "bold");
      pdf.text("\u2713", margin, y);
      pdf.setTextColor(30, 41, 59);
      pdf.setFont("helvetica", "bold");
      pdf.text(mod[0], margin + 6, y);
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
    pdf.text(p.pdfPricingTitle, margin + 4, y + 5.5);
    y += 14;

    const tableY = y;
    const col1 = margin;
    const col2 = margin + 90;
    const col3 = margin + 140;

    pdf.setFillColor(241, 245, 249);
    pdf.rect(margin, tableY, contentWidth, 8, "F");
    pdf.setTextColor(30, 41, 59);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    pdf.text(p.pdfService, col1 + 4, tableY + 5.5);
    pdf.text(p.pdfDuration, col2, tableY + 5.5);
    pdf.text(p.pdfPrice, col3, tableY + 5.5);

    y = tableY + 8;

    const rows = [
      [p.pdfStandard, p.pdfMonthly, `25 000 ${p.pdfPerMonth}`],
      [p.pdfStandard, p.pdfYearly, `300 000 ${p.pdfPerYear}`],
      [p.pdfStandard, p.pdfSixMonths, "165 000 (27 500/mois)"],
      [p.pdfMultiStore, p.pdfYearly, p.pdfOnQuote],
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

    pdf.setDrawColor(220, 220, 220);
    pdf.rect(margin, tableY, contentWidth, y - tableY);

    // ── Section 3: Frais de demarrage ──
    y += 10;
    pdf.setFillColor(30, 64, 175);
    pdf.roundedRect(margin, y, contentWidth, 8, 1.5, 1.5, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text(p.pdfStartupTitle, margin + 4, y + 5.5);
    y += 14;

    const startupRows = [
      [p.pdfInstallHybrid, "75 000"],
      [p.pdfFormationTeam, "25 000"],
    ];

    pdf.setFontSize(9);
    startupRows.forEach((row) => {
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
    pdf.text(p.pdfTotalStartup, col1 + 4, y + 6);
    pdf.text("100 000 FCFA", col3, y + 6);
    y += 15;

    // ── Section 4: Inclus dans la license ──
    y += 4;
    pdf.setFillColor(236, 253, 245);
    pdf.roundedRect(margin, y, contentWidth, 8, 1.5, 1.5, "F");
    pdf.setTextColor(6, 95, 70);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text(p.pdfIncludedTitle, margin + 4, y + 5.5);
    y += 14;

    const included = [
      p.incUpdates,
      p.incSupport,
      p.incBackup,
      p.incSync,
      p.incHosting,
      p.incSecurity,
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

    // ── Section 5: Pourquoi hybride ──
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
    pdf.text(p.pdfHybridTitle, margin + 4, y + 5.5);
    y += 14;

    const hybrid = [p.hybLocal, p.hybCloud, p.hybSecurity, p.hybPerf, p.hybAccess];

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
    pdf.text(p.pdfValid30, pageWidth - margin - 50, y);
    y += 4;
    pdf.text(p.pdfPoweredBy, margin, y);

    const fileName = locale === "fr"
      ? "KABRAK_Proposition_Commerciale.pdf"
      : "KABRAK_Commercial_Proposal.pdf";
    pdf.save(fileName);
    setGenerating(false);
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo + Language toggle */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <img
              src="/kabrak-logo.jpeg"
              alt="KABRAK"
              className="w-10 h-10 rounded-xl object-cover shadow-sm"
            />
            <span className="text-sm font-semibold text-neutral-900">KABRAK Retail</span>
          </div>
          <div className="flex items-center gap-0.5 bg-neutral-100 rounded-lg p-0.5">
            <button
              onClick={() => setLocale("fr")}
              className={cn(
                "px-3 py-1 text-xs font-bold rounded-md transition-all",
                locale === "fr"
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-400 hover:text-neutral-700"
              )}
            >
              FR
            </button>
            <button
              onClick={() => setLocale("en")}
              className={cn(
                "px-3 py-1 text-xs font-bold rounded-md transition-all",
                locale === "en"
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-400 hover:text-neutral-700"
              )}
            >
              EN
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-neutral-900">{p.title}</h1>
          <p className="text-sm text-neutral-500 mt-1">{p.subtitle}</p>
        </div>

        {/* Summary card */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-5 space-y-4 mb-4">
          <div className="flex items-center gap-2 text-neutral-900 font-semibold text-sm">
            <FileText className="w-4 h-4" />
            {p.summaryTitle}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">{p.licenseMonthly}</span>
              <span className="font-semibold">25 000 FCFA{locale === "fr" ? "/mois" : "/mo"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">{p.licenseYearly}</span>
              <span className="font-semibold">300 000 FCFA{locale === "fr" ? "/an" : "/yr"}</span>
            </div>
            <div className="border-t border-neutral-100 pt-2 mt-2">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">{p.installation}</span>
                <span className="font-semibold">75 000 FCFA</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">{p.formation}</span>
                <span className="font-semibold">25 000 FCFA</span>
              </div>
            </div>
            <div className="flex justify-between text-base font-bold pt-2 border-t border-neutral-200">
              <span>{p.totalStartup}</span>
              <span className="text-blue-700">100 000 FCFA</span>
            </div>
          </div>

          <div className="bg-emerald-50 rounded-xl p-3 space-y-1">
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">{p.includedTitle}</p>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600">
              <Check className="w-3 h-3" /> {p.includedUpdates}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600">
              <Check className="w-3 h-3" /> {p.includedCloud}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600">
              <Check className="w-3 h-3" /> {p.includedSync}
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
          {generating ? p.generating : p.downloadPdf}
        </button>

        <p className="text-center text-xs text-neutral-400 mt-4">{p.docHint}</p>
      </div>
    </div>
  );
}
