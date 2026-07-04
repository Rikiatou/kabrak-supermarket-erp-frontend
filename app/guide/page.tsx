"use client";

import { useState } from "react";
import Link from "next/link";
import {
  HelpCircle, LayoutDashboard, ShoppingCart, Package, Truck,
  Users, BookOpen, BarChart3, Cpu, Store, Upload, FileText,
  AlertTriangle, ScanLine, Calendar, Settings, History, Gift,
  ChevronRight, CheckCircle2, Lightbulb, AlertCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { useI18n } from "@/lib/i18n/context";
import { useAuth } from "@/lib/auth/context";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/auth/roles";

// ─── Guide content (bilingual) ───────────────────────────────────────────────

type ModuleGuide = {
  id: string;
  href: string;
  icon: React.ElementType;
  color: string;
  title: { fr: string; en: string };
  subtitle: { fr: string; en: string };
  description: { fr: string; en: string };
  actions: { fr: string; en: string }[];
  tips?: { fr: string; en: string }[];
  warnings?: { fr: string; en: string }[];
};

const ALL_MODULES: ModuleGuide[] = [
  {
    id: "dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    color: "bg-blue-100 text-blue-700",
    title: { fr: "Dashboard", en: "Dashboard" },
    subtitle: { fr: "Vue d'ensemble du magasin", en: "Store overview" },
    description: {
      fr: "Le tableau de bord affiche en temps réel les indicateurs clés : chiffre d'affaires du jour, nombre de transactions, alertes de stock, et graphiques de tendance.",
      en: "The dashboard displays real-time key indicators: today's revenue, transaction count, stock alerts, and trend charts.",
    },
    actions: [
      { fr: "Voir le CA du jour, de la semaine et du mois", en: "View revenue for today, week, and month" },
      { fr: "Consulter les alertes de rupture et d'expiration", en: "Check low-stock and expiry alerts" },
      { fr: "Voir les ventes récentes et les meilleurs articles", en: "See recent sales and top-selling items" },
      { fr: "Accéder rapidement à n'importe quel module", en: "Quickly access any module" },
    ],
    tips: [
      { fr: "Cliquer sur une alerte redirige directement vers le module concerné", en: "Clicking an alert redirects directly to the relevant module" },
    ],
  },
  {
    id: "pos",
    href: "/pos",
    icon: ShoppingCart,
    color: "bg-emerald-100 text-emerald-700",
    title: { fr: "Caisse / POS", en: "Checkout / POS" },
    subtitle: { fr: "Point de vente", en: "Point of sale" },
    description: {
      fr: "L'interface de caisse permet de traiter les ventes rapidement. Scanner un code-barres ou rechercher un produit, sélectionner la quantité, appliquer des remises et encaisser le paiement. Inclut la mise en attente de ventes et l'affichage client automatique.",
      en: "The POS interface allows fast sale processing. Scan a barcode or search a product, set quantity, apply discounts, and collect payment. Includes sale holding and automatic customer display.",
    },
    actions: [
      { fr: "Scanner un code-barres ou rechercher par nom", en: "Scan a barcode or search by name" },
      { fr: "Modifier les quantités directement sur la ligne", en: "Edit quantities directly on the line" },
      { fr: "Appliquer une remise (% ou montant fixe)", en: "Apply a discount (% or fixed amount)" },
      { fr: "Encaisser en espèces, mobile money ou carte", en: "Collect payment in cash, mobile money, or card" },
      { fr: "Imprimer un reçu thermique ou A4", en: "Print a thermal or A4 receipt" },
      { fr: "Associer un client fidélité à la vente", en: "Link a loyalty customer to the sale" },
      { fr: "Mettre une vente en attente ('Attente') si le client part temporairement", en: "Hold a sale ('Hold') if the customer leaves temporarily" },
      { fr: "Rappeler une vente en attente ('Rappeler') quand le client revient", en: "Recall a held sale ('Recall') when the customer returns" },
      { fr: "Connecter un afficheur client USB (bouton 'USB')", en: "Connect a USB customer display ('USB' button)" },
    ],
    tips: [
      { fr: "Touche Entrée après le code-barres = ajout instantané", en: "Enter key after barcode = instant add" },
      { fr: "Le POS fonctionne même sans connexion internet (mode hors-ligne)", en: "POS works offline (offline mode)" },
      { fr: "Bouton 'Attente' (orange) : sauvegarde le panier, vide la caisse pour servir un autre client", en: "'Hold' button (orange): saves the cart, clears the register to serve another customer" },
      { fr: "Bouton 'Rappeler' (bleu, avec badge) : liste les paniers en attente avec n°, articles, total et heure", en: "'Recall' button (blue, with badge): lists held carts with number, items, total and time" },
      { fr: "Les paniers en attente persistent même après fermeture du navigateur", en: "Held carts persist even after closing the browser" },
      { fr: "Écran client : ouvrir /pos/display dans un nouvel onglet, glisser sur le 2e moniteur, F11 = plein écran", en: "Customer display: open /pos/display in a new tab, drag to 2nd monitor, F11 = fullscreen" },
      { fr: "L'écran client se met à jour automatiquement à chaque scan (rien à cliquer)", en: "The customer display updates automatically on every scan (nothing to click)" },
      { fr: "Afficheur USB : bouton 'USB' → Chrome demande le port COM → connecté (vert). Chrome/Edge uniquement", en: "USB display: 'USB' button → Chrome asks for COM port → connected (green). Chrome/Edge only" },
      { fr: "L'écran client affiche le nom du magasin et les messages dans la langue choisie (FR/EN)", en: "Customer display shows store name and messages in the selected language (FR/EN)" },
    ],
    warnings: [
      { fr: "Toujours ouvrir une session de caisse avant de commencer à vendre", en: "Always open a cash session before starting to sell" },
      { fr: "L'afficheur USB nécessite Chrome ou Edge (Web Serial API non supporté sur Firefox)", en: "USB display requires Chrome or Edge (Web Serial API not supported on Firefox)" },
    ],
  },
  {
    id: "stocks",
    href: "/stocks",
    icon: Package,
    color: "bg-amber-100 text-amber-700",
    title: { fr: "Stocks & Inventaire", en: "Stock & Inventory" },
    subtitle: { fr: "Gestion des produits et niveaux de stock", en: "Product and stock level management" },
    description: {
      fr: "Gérer tout le catalogue produits : ajouter, modifier, ajuster les stocks, suivre les dates d'expiration par lot, et consulter les mouvements par produit.",
      en: "Manage the full product catalog: add, edit, adjust stock, track expiry dates per batch, and view movements per product.",
    },
    actions: [
      { fr: "Ajouter un nouveau produit (nom, prix, code-barres, catégorie)", en: "Add a new product (name, price, barcode, category)" },
      { fr: "Modifier le prix ou la quantité en stock", en: "Edit price or stock quantity" },
      { fr: "Faire un ajustement de stock (gain ou perte)", en: "Make a stock adjustment (gain or loss)" },
      { fr: "Voir les articles en rupture ou proches de l'expiration", en: "View out-of-stock or near-expiry items" },
      { fr: "Consulter l'historique des mouvements d'un produit", en: "View the movement history of a product" },
      { fr: "Appliquer un prix de promotion temporaire", en: "Apply a temporary promotional price" },
      { fr: "Consulter les lots (batches) d'un produit — section dépliable 'Lots'", en: "View a product's batches — expandable 'Batches' section" },
    ],
    tips: [
      { fr: "Le badge rouge sur le menu Stocks indique le nombre d'alertes actives", en: "The red badge on the Stock menu shows the number of active alerts" },
      { fr: "Un article dont la date d'expiration est dans 7 jours passe en alerte orange", en: "An item expiring within 7 days turns to an orange alert" },
      { fr: "Section 'Lots' : chaque livraison crée un lot avec sa propre date d'expiration", en: "'Batches' section: each delivery creates a batch with its own expiry date" },
      { fr: "Un produit peut avoir plusieurs lots avec des dates différentes (même code-barres)", en: "A product can have multiple batches with different dates (same barcode)" },
      { fr: "À la caisse, le système vend automatiquement le lot le plus ancien en premier (FIFO)", en: "At checkout, the system automatically sells the oldest batch first (FIFO)" },
      { fr: "Chaque lot affiche : quantité restante/initiale, date de réception, date d'expiration, D-jours", en: "Each batch shows: remaining/initial quantity, received date, expiry date, D-days" },
      { fr: "Couleurs des lots : rouge = expiré, orange = ≤7 jours, normal = OK", en: "Batch colors: red = expired, orange = ≤7 days, normal = OK" },
    ],
  },
  {
    id: "import",
    href: "/import",
    icon: Upload,
    color: "bg-violet-100 text-violet-700",
    title: { fr: "Import", en: "Import" },
    subtitle: { fr: "Importation en masse de produits", en: "Bulk product import" },
    description: {
      fr: "Importer plusieurs centaines de produits en une seule fois via un fichier CSV ou Excel. Idéal pour la mise en place initiale du magasin ou les mises à jour de catalogue.",
      en: "Import hundreds of products at once via a CSV or Excel file. Ideal for initial store setup or catalog updates.",
    },
    actions: [
      { fr: "Télécharger le modèle CSV avec les colonnes requises", en: "Download the CSV template with required columns" },
      { fr: "Remplir le fichier : nom, prix, stock, code-barres, catégorie", en: "Fill the file: name, price, stock, barcode, category" },
      { fr: "Glisser-déposer le fichier ou cliquer pour sélectionner", en: "Drag and drop the file or click to select" },
      { fr: "Vérifier l'aperçu avant de confirmer l'import", en: "Check the preview before confirming the import" },
    ],
    warnings: [
      { fr: "Les codes-barres doivent être uniques — les doublons écrasent l'article existant", en: "Barcodes must be unique — duplicates overwrite the existing item" },
    ],
  },
  {
    id: "scanner",
    href: "/scanner",
    icon: ScanLine,
    color: "bg-cyan-100 text-cyan-700",
    title: { fr: "Scanner", en: "Scanner" },
    subtitle: { fr: "Recherche rapide par code-barres", en: "Quick barcode search" },
    description: {
      fr: "Scanner un code-barres pour afficher immédiatement les informations du produit : nom, prix, stock restant, date d'expiration.",
      en: "Scan a barcode to instantly display product info: name, price, remaining stock, expiry date.",
    },
    actions: [
      { fr: "Scanner avec un lecteur USB ou la caméra du téléphone", en: "Scan with a USB reader or phone camera" },
      { fr: "Voir prix, stock, catégorie et expiration en un coup d'œil", en: "View price, stock, category, and expiry at a glance" },
      { fr: "Accéder directement à la fiche produit pour modification", en: "Jump to the product card for editing" },
    ],
    tips: [
      { fr: "Utiliser la caméra du téléphone pour scanner en rayons sans scanner USB", en: "Use the phone camera to scan on shelves without a USB scanner" },
    ],
  },
  {
    id: "achats",
    href: "/achats",
    icon: Truck,
    color: "bg-orange-100 text-orange-700",
    title: { fr: "Achats & Fournisseurs", en: "Purchases & Suppliers" },
    subtitle: { fr: "Commandes et réceptions de marchandises", en: "Purchase orders and goods receipt" },
    description: {
      fr: "Gérer les fournisseurs, créer des bons de commande, enregistrer les livraisons et mettre à jour le stock automatiquement à la réception. Chaque livraison avec date d'expiration crée un lot (batch) séparé.",
      en: "Manage suppliers, create purchase orders, record deliveries, and auto-update stock on receipt. Each delivery with an expiry date creates a separate batch.",
    },
    actions: [
      { fr: "Créer et gérer les fiches fournisseurs", en: "Create and manage supplier cards" },
      { fr: "Créer un bon de commande (BC) avec les articles commandés", en: "Create a purchase order (PO) with ordered items" },
      { fr: "Enregistrer une livraison directe (bon de livraison)", en: "Record a direct delivery (delivery note)" },
      { fr: "Saisir la date d'expiration pour chaque ligne de livraison", en: "Enter the expiry date for each delivery line" },
      { fr: "Valider la réception : le stock est mis à jour + un lot est créé automatiquement", en: "Confirm receipt: stock is updated + a batch is created automatically" },
      { fr: "Scanner les articles reçus directement depuis le module", en: "Scan received items directly from the module" },
    ],
    tips: [
      { fr: "Un bon de commande partiellement reçu reste en statut 'partiel' jusqu'à réception complète", en: "A partially received PO stays in 'partial' status until fully received" },
      { fr: "La date d'expiration saisie crée un lot visible dans Stocks → détail produit → 'Lots'", en: "The entered expiry date creates a batch visible in Stocks → product detail → 'Batches'" },
      { fr: "Deux livraisons du même produit avec dates différentes = deux lots séparés", en: "Two deliveries of the same product with different dates = two separate batches" },
    ],
  },
  {
    id: "factures",
    href: "/factures",
    icon: FileText,
    color: "bg-blue-100 text-blue-700",
    title: { fr: "Factures", en: "Invoices" },
    subtitle: { fr: "Facturation clients B2B et collecte différée", en: "B2B customer invoicing and deferred collection" },
    description: {
      fr: "Créer des factures pour les clients professionnels, suivre les paiements échelonnés, gérer les articles réservés (payés mais non collectés) et traiter les échanges.",
      en: "Create invoices for business clients, track installment payments, manage reserved items (paid but not collected), and process exchanges.",
    },
    actions: [
      { fr: "Créer une facture avec un ou plusieurs articles", en: "Create an invoice with one or more items" },
      { fr: "Enregistrer un acompte ou un paiement partiel", en: "Record a deposit or partial payment" },
      { fr: "Cocher 'Collecte différée' si le client paie mais collecte plus tard", en: "Check 'Deferred Collection' if the customer pays but collects later" },
      { fr: "Traiter la collecte : confirmer en l'état ou échanger l'article", en: "Process collection: confirm as-is or exchange the item" },
      { fr: "Imprimer la facture en format A4 ou ticket", en: "Print the invoice as A4 or ticket format" },
    ],
    tips: [
      { fr: "Badge violet = facture 'Réservée' (payée, article pas encore collecté)", en: "Purple badge = 'Reserved' invoice (paid, item not yet collected)" },
      { fr: "L'échange calcule automatiquement la différence de prix", en: "Exchange automatically calculates the price difference" },
    ],
  },
  {
    id: "clients",
    href: "/clients",
    icon: Users,
    color: "bg-pink-100 text-pink-700",
    title: { fr: "Fidélité Client", en: "Customer Loyalty" },
    subtitle: { fr: "Base de données clients et fidélisation", en: "Customer database and loyalty" },
    description: {
      fr: "Gérer les clients fidèles : historique d'achats, total dépensé, points de fidélité, et communications.",
      en: "Manage loyal customers: purchase history, total spent, loyalty points, and communications.",
    },
    actions: [
      { fr: "Ajouter un client (nom, téléphone, email)", en: "Add a customer (name, phone, email)" },
      { fr: "Consulter le total des achats et l'historique", en: "View total purchases and history" },
      { fr: "Associer un client à une vente POS ou une facture", en: "Link a customer to a POS sale or invoice" },
    ],
  },
  {
    id: "pertes",
    href: "/pertes",
    icon: AlertTriangle,
    color: "bg-red-100 text-red-700",
    title: { fr: "Pertes & Dommages", en: "Losses & Damage" },
    subtitle: { fr: "Enregistrement des pertes de stock", en: "Stock loss recording" },
    description: {
      fr: "Enregistrer les articles perdus, abîmés, expirés ou volés. Le stock est automatiquement décrémenté et la perte est tracée pour les rapports.",
      en: "Record lost, damaged, expired, or stolen items. Stock is auto-decremented and the loss is tracked for reports.",
    },
    actions: [
      { fr: "Sélectionner le produit et la quantité perdue", en: "Select the product and lost quantity" },
      { fr: "Choisir la raison (expiré, abîmé, volé, autre)", en: "Choose the reason (expired, damaged, stolen, other)" },
      { fr: "Ajouter une note ou une photo si nécessaire", en: "Add a note or photo if needed" },
      { fr: "Le stock est mis à jour automatiquement", en: "Stock is automatically updated" },
    ],
    warnings: [
      { fr: "Une perte ne peut pas être annulée — vérifier avant de confirmer", en: "A loss cannot be undone — verify before confirming" },
    ],
  },
  {
    id: "cadeaux",
    href: "/cadeaux",
    icon: Gift,
    color: "bg-purple-100 text-purple-700",
    title: { fr: "Cadeaux & Dons", en: "Gifts & Donations" },
    subtitle: { fr: "Articles offerts ou donnés", en: "Items given away or donated" },
    description: {
      fr: "Tracer les articles sortis gratuitement du stock (promotions, dons à des associations, cadeaux clients VIP). Le stock est mis à jour et la sortie est enregistrée séparément des ventes.",
      en: "Track items removed from stock for free (promotions, charity donations, VIP customer gifts). Stock updates and the outflow is recorded separately from sales.",
    },
    actions: [
      { fr: "Sélectionner l'article et la quantité offerte", en: "Select the item and gifted quantity" },
      { fr: "Préciser le destinataire et la raison", en: "Specify the recipient and reason" },
      { fr: "Le mouvement de stock est créé automatiquement", en: "Stock movement is created automatically" },
    ],
  },
  {
    id: "historique",
    href: "/historique",
    icon: History,
    color: "bg-slate-100 text-slate-700",
    title: { fr: "Historique", en: "History" },
    subtitle: { fr: "Transactions et mouvements de stock", en: "Transactions and stock movements" },
    description: {
      fr: "Deux vues : l'historique des ventes (transactions POS) et les mouvements de stock par produit. Permet aussi de traiter les retours produits.",
      en: "Two views: sales history (POS transactions) and stock movements per product. Also handles product returns.",
    },
    actions: [
      { fr: "Consulter toutes les ventes (ou seulement les siennes pour un caissier)", en: "View all sales (or only your own as a cashier)" },
      { fr: "Voir les mouvements d'un produit : entrées, sorties, ajustements", en: "View product movements: in, out, adjustments" },
      { fr: "Cliquer 'Retour' sur une transaction pour traiter un retour client", en: "Click 'Return' on a transaction to process a customer return" },
      { fr: "Exporter l'historique en CSV", en: "Export history as CSV" },
    ],
    tips: [
      { fr: "Le retour remet automatiquement les articles en stock", en: "A return automatically restocks the items" },
    ],
  },
  {
    id: "comptabilite",
    href: "/comptabilite",
    icon: BookOpen,
    color: "bg-teal-100 text-teal-700",
    title: { fr: "Comptabilité", en: "Accounting" },
    subtitle: { fr: "Dépenses, flux de trésorerie et clôtures", en: "Expenses, cash flow, and closing" },
    description: {
      fr: "Saisir les dépenses, visualiser les flux de trésorerie, comparer revenus et coûts, et exporter les données comptables.",
      en: "Enter expenses, view cash flow, compare revenue and costs, and export accounting data.",
    },
    actions: [
      { fr: "Enregistrer une dépense (loyer, salaires, fournitures…)", en: "Record an expense (rent, wages, supplies…)" },
      { fr: "Voir le bilan du mois : revenus vs dépenses", en: "View the monthly balance: revenue vs expenses" },
      { fr: "Exporter le grand livre pour le comptable", en: "Export the ledger for the accountant" },
    ],
  },
  {
    id: "rapports",
    href: "/rapports",
    icon: BarChart3,
    color: "bg-indigo-100 text-indigo-700",
    title: { fr: "Rapports & BI", en: "Reports & BI" },
    subtitle: { fr: "Analyse des performances du magasin", en: "Store performance analysis" },
    description: {
      fr: "Tableaux de bord analytiques : ventes par période, par employé, par catégorie, marges, rotations de stock, clients les plus actifs.",
      en: "Analytics dashboards: sales by period, employee, category, margins, stock turnover, most active customers.",
    },
    actions: [
      { fr: "Filtrer les rapports par date, catégorie ou employé", en: "Filter reports by date, category, or employee" },
      { fr: "Voir les produits les plus et moins vendus", en: "View best and worst selling products" },
      { fr: "Analyser les heures de pointe", en: "Analyze peak hours" },
      { fr: "Exporter les rapports en CSV ou PDF", en: "Export reports as CSV or PDF" },
    ],
  },
  {
    id: "ia",
    href: "/ia",
    icon: Cpu,
    color: "bg-violet-100 text-violet-700",
    title: { fr: "IA & Prévisions", en: "AI & Forecasts" },
    subtitle: { fr: "Assistant intelligent pour le magasin", en: "Intelligent store assistant" },
    description: {
      fr: "L'assistant IA analyse les données du magasin et répond aux questions en langage naturel : prévisions de ventes, suggestions de réapprovisionnement, détection d'anomalies.",
      en: "The AI assistant analyzes store data and answers questions in natural language: sales forecasts, restock suggestions, anomaly detection.",
    },
    actions: [
      { fr: "Poser une question en français ou anglais", en: "Ask a question in French or English" },
      { fr: "Obtenir des prévisions de stock pour la semaine", en: "Get stock forecasts for the week" },
      { fr: "Identifier les produits à risque de rupture", en: "Identify products at risk of running out" },
    ],
    tips: [
      { fr: "Plus le magasin accumule de données, plus les prévisions sont précises", en: "The more data the store accumulates, the more accurate the forecasts" },
    ],
  },
  {
    id: "caisses",
    href: "/caisses",
    icon: Store,
    color: "bg-green-100 text-green-700",
    title: { fr: "Caisses", en: "Cash Registers" },
    subtitle: { fr: "Sessions de caisse et clôtures journalières", en: "Cash sessions and daily closing" },
    description: {
      fr: "Ouvrir et fermer les sessions de caisse, compter la caisse physique et comparer avec le théorique calculé par le système.",
      en: "Open and close cash sessions, count the physical cash, and compare with the system's calculated amount.",
    },
    actions: [
      { fr: "Ouvrir une session avec le fonds de caisse de départ", en: "Open a session with the opening cash fund" },
      { fr: "Clôturer la session : saisir la caisse comptée", en: "Close the session: enter the counted cash" },
      { fr: "Voir l'écart (différence théorique vs réel)", en: "View the discrepancy (theoretical vs actual)" },
      { fr: "Imprimer le rapport de caisse journalier", en: "Print the daily cash report" },
    ],
    warnings: [
      { fr: "Toujours clôturer la session avant de quitter le poste", en: "Always close the session before leaving the workstation" },
    ],
  },
  {
    id: "employes",
    href: "/employes",
    icon: Users,
    color: "bg-sky-100 text-sky-700",
    title: { fr: "Employés", en: "Employees" },
    subtitle: { fr: "Gestion des comptes et PINs", en: "Account and PIN management" },
    description: {
      fr: "Créer et gérer les comptes employés : rôle, code employé, PIN de connexion. Les employés se connectent avec leur code + PIN.",
      en: "Create and manage employee accounts: role, employee code, login PIN. Employees log in with their code + PIN.",
    },
    actions: [
      { fr: "Créer un nouvel employé avec rôle et PIN personnalisé", en: "Create a new employee with role and custom PIN" },
      { fr: "Modifier le PIN d'un employé existant", en: "Change an existing employee's PIN" },
      { fr: "Voir le code employé généré (ex: EMP003)", en: "View the generated employee code (e.g. EMP003)" },
      { fr: "Désactiver un compte employé", en: "Deactivate an employee account" },
    ],
    tips: [
      { fr: "Le code employé est affiché clairement à la création — le noter immédiatement", en: "The employee code is clearly shown at creation — note it immediately" },
    ],
  },
  {
    id: "planning",
    href: "/planning",
    icon: Calendar,
    color: "bg-rose-100 text-rose-700",
    title: { fr: "Planning", en: "Schedule" },
    subtitle: { fr: "Planification des horaires", en: "Staff scheduling" },
    description: {
      fr: "Gérer les plannings hebdomadaires des employés : affecter des postes et des horaires, visualiser qui travaille quel jour.",
      en: "Manage weekly employee schedules: assign shifts and hours, see who works which day.",
    },
    actions: [
      { fr: "Créer un planning pour la semaine", en: "Create a schedule for the week" },
      { fr: "Affecter des créneaux horaires par employé", en: "Assign time slots per employee" },
      { fr: "Voir la vue calendrier de l'équipe", en: "View the team calendar view" },
    ],
  },
  {
    id: "settings",
    href: "/settings",
    icon: Settings,
    color: "bg-gray-100 text-gray-700",
    title: { fr: "Paramètres", en: "Settings" },
    subtitle: { fr: "Configuration du magasin (Boss uniquement)", en: "Store configuration (Boss only)" },
    description: {
      fr: "Configurer le nom du magasin, l'adresse, le logo, le pied de page des factures, la devise et les préférences système.",
      en: "Configure store name, address, logo, invoice footer, currency, and system preferences.",
    },
    actions: [
      { fr: "Modifier le nom et l'adresse du magasin", en: "Edit store name and address" },
      { fr: "Uploader le logo (affiché sur les factures et le sidebar)", en: "Upload logo (shown on invoices and sidebar)" },
      { fr: "Configurer le pied de page des factures", en: "Configure invoice footer text" },
      { fr: "Changer la langue (Français / English)", en: "Change language (French / English)" },
    ],
    warnings: [
      { fr: "Accessible uniquement au rôle Boss", en: "Accessible only to the Boss role" },
    ],
  },
];

// Module IDs accessible per role
const ROLE_MODULES: Record<Role, string[]> = {
  boss:       ["dashboard","pos","stocks","import","achats","factures","employes","caisses","planning","clients","pertes","cadeaux","scanner","comptabilite","rapports","ia","historique","settings"],
  manager:    ["dashboard","pos","stocks","import","achats","factures","employes","caisses","planning","clients","pertes","cadeaux","scanner","comptabilite","rapports","ia","historique"],
  accountant: ["dashboard","pos","stocks","achats","factures","caisses","planning","clients","pertes","cadeaux","scanner","comptabilite","rapports","historique"],
  supervisor: ["dashboard","pos","stocks","achats","factures","caisses","planning","clients","pertes","scanner","rapports"],
  cashier:    ["dashboard","pos","caisses","scanner","clients","historique","factures","cadeaux"],
  stockist:   ["dashboard","stocks","import","achats","pertes","scanner","historique","factures"],
};

const ROLE_LABELS: Record<Role, { fr: string; en: string; color: string }> = {
  boss:       { fr: "Patron / Boss", en: "Owner / Boss", color: "bg-amber-100 text-amber-800 border-amber-300" },
  manager:    { fr: "Manager", en: "Manager", color: "bg-blue-100 text-blue-800 border-blue-300" },
  accountant: { fr: "Comptable", en: "Accountant", color: "bg-teal-100 text-teal-800 border-teal-300" },
  supervisor: { fr: "Superviseur", en: "Supervisor", color: "bg-purple-100 text-purple-800 border-purple-300" },
  cashier:    { fr: "Caissier / Caissière", en: "Cashier", color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  stockist:   { fr: "Magasinier / Stockiste", en: "Stockist", color: "bg-orange-100 text-orange-800 border-orange-300" },
};

const ROLES: Role[] = ["boss", "manager", "accountant", "supervisor", "cashier", "stockist"];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GuidePage() {
  const { locale } = useI18n();
  const { user } = useAuth();
  const L = locale === "fr" ? "fr" : "en";

  const defaultRole: Role = (user?.role as Role) || "cashier";
  const [activeRole, setActiveRole] = useState<Role>(defaultRole);

  const moduleIds = ROLE_MODULES[activeRole];
  const modules = ALL_MODULES.filter((m) => moduleIds.includes(m.id));

  return (
    <AppShell
      title={L === "fr" ? "Guide utilisateur" : "User Guide"}
      subtitle={L === "fr" ? "Référence complète par rôle" : "Complete reference by role"}
    >
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Role selector */}
        <Card className="p-4">
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">
            {L === "fr" ? "Choisir un rôle" : "Select a role"}
          </p>
          <div className="flex flex-wrap gap-2">
            {ROLES.map((role) => {
              const info = ROLE_LABELS[role];
              return (
                <button
                  key={role}
                  onClick={() => setActiveRole(role)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all",
                    activeRole === role
                      ? info.color + " shadow-sm scale-[1.02]"
                      : "bg-[var(--surface-2)] text-[var(--text-secondary)] border-transparent hover:border-[var(--border)]"
                  )}
                >
                  {info[L]}
                  {role === (user?.role as Role) && (
                    <span className="ml-1.5 text-[10px] opacity-60">({L === "fr" ? "vous" : "you"})</span>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Role description */}
        <div className={cn("px-5 py-4 rounded-2xl border-2", ROLE_LABELS[activeRole].color)}>
          <div className="flex items-center gap-2 mb-1">
            <HelpCircle className="w-4 h-4" />
            <span className="font-bold text-sm">{ROLE_LABELS[activeRole][L]}</span>
            <span className="text-xs opacity-70 ml-auto">{moduleIds.length} {L === "fr" ? "modules accessibles" : "accessible modules"}</span>
          </div>
          <p className="text-xs opacity-80">
            {activeRole === "boss" && (L === "fr" ? "Accès complet à tous les modules. Peut configurer le magasin, gérer les employés et voir toutes les données." : "Full access to all modules. Can configure the store, manage employees, and view all data.")}
            {activeRole === "manager" && (L === "fr" ? "Accès à presque tout sauf les Paramètres système. Gère les opérations quotidiennes et l'équipe." : "Access to almost everything except system Settings. Manages daily operations and the team.")}
            {activeRole === "accountant" && (L === "fr" ? "Focus sur la finance et les opérations. Accès à la comptabilité, factures, rapports et suivi des stocks." : "Finance and operations focus. Access to accounting, invoices, reports, and stock tracking.")}
            {activeRole === "supervisor" && (L === "fr" ? "Supervise les opérations quotidiennes. Accès aux ventes, stocks, rapports et gestion de caisse." : "Supervises daily operations. Access to sales, stock, reports, and cash register management.")}
            {activeRole === "cashier" && (L === "fr" ? "Travaille principalement en caisse. Voit ses propres ventes, peut facturer et scanner les produits." : "Works mainly at the checkout. Views own sales, can invoice and scan products.")}
            {activeRole === "stockist" && (L === "fr" ? "Gère les marchandises et les réceptions. Accès aux stocks, achats, pertes et scanner." : "Manages goods and deliveries. Access to stock, purchases, losses, and scanner.")}
          </p>
        </div>

        {/* Module cards */}
        <div className="space-y-4">
          <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest px-1">
            {L === "fr" ? "Modules & fonctionnalités" : "Modules & features"}
          </p>
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Card key={mod.id} className="overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-4 px-5 py-4 border-b border-[var(--border-subtle)]">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", mod.color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">{mod.title[L]}</h3>
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">{mod.subtitle[L]}</p>
                  </div>
                  <Link
                    href={mod.href}
                    className="flex items-center gap-1 text-xs text-[var(--brand)] hover:underline font-medium shrink-0"
                  >
                    {L === "fr" ? "Ouvrir" : "Open"}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="px-5 py-4 space-y-4">
                  {/* Description */}
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{mod.description[L]}</p>

                  {/* Actions */}
                  <div>
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">
                      {L === "fr" ? "Ce que vous pouvez faire" : "What you can do"}
                    </p>
                    <ul className="space-y-1.5">
                      {mod.actions.map((action, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                          <span>{action[L]}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Tips */}
                  {mod.tips && mod.tips.length > 0 && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 space-y-1.5">
                      {mod.tips.map((tip, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-blue-800">
                          <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-500" />
                          <span>{tip[L]}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Warnings */}
                  {mod.warnings && mod.warnings.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-1.5">
                      {mod.warnings.map((w, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-amber-800">
                          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
                          <span>{w[L]}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Footer */}
        <div className="text-center py-6 text-xs text-[var(--text-muted)]">
          <p className="font-semibold text-[var(--text-secondary)] mb-1">KABRAK ERP</p>
          <p>{L === "fr" ? "Pour toute assistance, contacter votre administrateur système." : "For assistance, contact your system administrator."}</p>
        </div>
      </div>
    </AppShell>
  );
}
