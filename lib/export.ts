// Utilitaires d'export CSV et impression

/**
 * Convertit un tableau de données en CSV et déclenche le téléchargement
 */
export function exportToCSV(
  data: Record<string, string | number | boolean | null | undefined>[],
  filename: string,
  headers?: { key: string; label: string }[],
) {
  if (!data.length) return;

  // Déterminer les colonnes
  const cols = headers || Object.keys(data[0]).map((key) => ({ key, label: key }));

  // Construire le CSV
  const csvRows: string[] = [];

  // En-têtes
  csvRows.push(cols.map((c) => `"${c.label}"`).join(","));

  // Données
  for (const row of data) {
    csvRows.push(
      cols
        .map((c) => {
          const val = row[c.key];
          if (val === null || val === undefined) return '""';
          if (typeof val === "string" && val.includes(",")) return `"${val.replace(/"/g, '""')}"`;
          return `"${val}"`;
        })
        .join(","),
    );
  }

  // BOM pour Excel (UTF-8)
  const csv = "\uFEFF" + csvRows.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Imprime la page courante (ou une section spécifique)
 */
export function printSection(elementId?: string) {
  if (elementId) {
    const el = document.getElementById(elementId);
    if (el) {
      const original = document.body.innerHTML;
      const printContent = el.innerHTML;
      document.body.innerHTML = `<div style="padding: 20px;">${printContent}</div>`;
      window.print();
      document.body.innerHTML = original;
      window.location.reload();
      return;
    }
  }
  window.print();
}

/**
 * Formate un nombre en FCFA pour l'export
 */
export function formatFCFA(amount: number): string {
  return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
}
