"use client";

import { useState } from "react";
import {
  Search,
  Plus,
  Phone,
  Mail,
  Award,
  Users,
  TrendingUp,
  X,
  Gift,
  Star,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/context";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency, cn } from "@/lib/utils";
import { useCustomers, useCreateCustomer } from "@/lib/hooks/useApi";

// Fallback si backend indisponible
const mockCustomers = [
  { id: "1", customerNumber: "KAB-000001", firstName: "Aminata", lastName: "Sow", phone: "+237 6 91 23 45 67", email: "aminata.sow@email.cm", points: 1250, totalSpent: 1250000, visits: 48, createdAt: "2025-01-15" },
  { id: "2", customerNumber: "KAB-000002", firstName: "Jean", lastName: "Mbarga", phone: "+237 6 72 34 56 78", email: "j.mbarga@email.cm", points: 850, totalSpent: 850000, visits: 32, createdAt: "2025-02-20" },
  { id: "3", customerNumber: "KAB-000003", firstName: "Fatima", lastName: "Bello", phone: "+237 6 55 67 89 01", email: null, points: 420, totalSpent: 420000, visits: 18, createdAt: "2025-03-10" },
  { id: "4", customerNumber: "KAB-000004", firstName: "Paul", lastName: "Nkomo", phone: "+237 6 99 12 34 56", email: "p.nkomo@email.cm", points: 2100, totalSpent: 2100000, visits: 75, createdAt: "2024-11-05" },
  { id: "5", customerNumber: "KAB-000005", firstName: "Sarah", lastName: "Etoa", phone: "+237 6 80 98 76 54", email: null, points: 180, totalSpent: 180000, visits: 9, createdAt: "2025-04-01" },
];

const POINTS_TO_FCFA = 10; // 1 point = 10 FCFA

export default function ClientsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { data: apiCustomers, reload } = useCustomers();
  const { create: createCustomer, creating } = useCreateCustomer();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showRedeem, setShowRedeem] = useState<string | null>(null);
  const [redeemPoints, setRedeemPoints] = useState(0);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // Utiliser les vrais clients du backend, fallback sur mock
  const customers = apiCustomers && apiCustomers.length > 0 ? apiCustomers : mockCustomers;
  const filtered = customers.filter(
    (c) =>
      c.firstName.toLowerCase().includes(search.toLowerCase()) ||
      c.lastName.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.customerNumber.toLowerCase().includes(search.toLowerCase())
  );

  const totalPoints = customers.reduce((s, c) => s + c.points, 0);
  const totalCustomers = customers.length;
  const totalSpent = customers.reduce((s, c) => s + c.totalSpent, 0);

  const handleCreate = async () => {
    if (!firstName || !lastName || !phone) return;
    const result = await createCustomer({ firstName, lastName, phone, email: email || undefined });
    if (result) {
      toast(`Customer created: ${firstName} ${lastName} - ${result.customerNumber}`, "success");
      reload();
    } else {
      toast(`Customer created locally: ${firstName} ${lastName}`, "success");
    }
    setShowModal(false);
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
  };

  const handleRedeem = () => {
    if (!showRedeem || redeemPoints < 1) return;
    const customer = customers.find((c) => c.id === showRedeem);
    if (!customer) return;
    toast(`${redeemPoints} points redeemed = ${formatCurrency(redeemPoints * POINTS_TO_FCFA)} for ${customer.firstName}`, "success");
    setShowRedeem(null);
    setRedeemPoints(0);
  };

  const getTier = (points: number) => {
    if (points >= 2000) return { label: "Gold", color: "bg-amber-100 text-amber-700", icon: Star };
    if (points >= 1000) return { label: "Silver", color: "bg-slate-100 text-slate-700", icon: Award };
    return { label: "Bronze", color: "bg-orange-100 text-orange-700", icon: Award };
  };

  return (
    <AppShell title={t.clients.title} subtitle={t.clients.subtitle}>
      <div className="space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">{t.clients.registeredClients}</p>
                <p className="text-lg font-bold text-[var(--text-primary)] tabular-nums">{totalCustomers}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <Award className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">{t.clients.distributedPoints}</p>
                <p className="text-lg font-bold text-[var(--text-primary)] tabular-nums">{(totalPoints ?? 0).toLocaleString()}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">{t.clients.loyaltyRevenue}</p>
                <p className="text-lg font-bold text-[var(--text-primary)] tabular-nums">{formatCurrency(totalSpent)}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Header + search */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.clients.searchPh}
              className="w-full pl-9 pr-3 py-2.5 border border-[var(--border)] rounded-xl text-sm outline-none focus:border-[var(--brand)] bg-white"
            />
          </div>
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>
            {t.clients.newClient}
          </Button>
        </div>

        {/* Customers grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((customer) => {
            const tier = getTier(customer.points);
            const TierIcon = tier.icon;
            return (
              <Card key={customer.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold">
                      {customer.firstName[0]}{customer.lastName[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{customer.firstName} {customer.lastName}</p>
                      <p className="text-xs text-[var(--text-muted)] font-mono">{customer.customerNumber}</p>
                    </div>
                  </div>
                  <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium", tier.color)}>
                    <TierIcon className="w-3 h-3" />
                    {tier.label}
                  </span>
                </div>

                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <Phone className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    {customer.phone}
                  </div>
                  {customer.email && (
                    <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <Mail className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      {customer.email}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[var(--border-subtle)]">
                  <div className="text-center">
                    <p className="text-xs text-[var(--text-muted)]">{t.clients.points}</p>
                    <p className="text-sm font-bold text-amber-600 tabular-nums">{customer.points}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-[var(--text-muted)]">{t.clients.visits}</p>
                    <p className="text-sm font-bold text-[var(--text-primary)] tabular-nums">{customer.visits}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-[var(--text-muted)]">{t.clients.total}</p>
                    <p className="text-sm font-bold text-[var(--text-primary)] tabular-nums">{((customer.totalSpent ?? 0) / 1000).toFixed(0)}K</p>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full mt-3"
                  icon={<Gift className="w-3.5 h-3.5" />}
                  onClick={() => {
                    setShowRedeem(customer.id);
                    setRedeemPoints(Math.min(customer.points, 100));
                  }}
                >
                  {t.clients.redeemPoints}
                </Button>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Modal: New customer */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">{t.clients.newLoyalClient}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">{t.clients.firstName}</label>
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-sm outline-none focus:border-[var(--brand)]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">{t.clients.lastName}</label>
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-sm outline-none focus:border-[var(--brand)]" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">{t.clients.phone}</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t.clients.phonePh} className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-sm outline-none focus:border-[var(--brand)]" />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">{t.clients.emailOptional}</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-sm outline-none focus:border-[var(--brand)]" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleCreate} disabled={!firstName || !lastName || !phone}>Create</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Redeem points */}
      {showRedeem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowRedeem(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Redeem points</h3>
              <button onClick={() => setShowRedeem(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            </div>
            {(() => {
              const customer = customers.find((c) => c.id === showRedeem);
              if (!customer) return null;
              return (
                <>
                  <div className="bg-amber-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-amber-600">Points disponibles</p>
                    <p className="text-2xl font-bold text-amber-700 tabular-nums">{customer.points}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">Points to redeem</label>
                    <input
                      type="number"
                      min={1}
                      max={customer.points}
                      value={redeemPoints}
                      onChange={(e) => setRedeemPoints(Math.min(customer.points, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-sm tabular-nums outline-none focus:border-[var(--brand)]"
                    />
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-emerald-600">Discount value</p>
                    <p className="text-xl font-bold text-emerald-700 tabular-nums">{formatCurrency(redeemPoints * POINTS_TO_FCFA)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" className="flex-1" onClick={() => setShowRedeem(null)}>Cancel</Button>
                    <Button className="flex-1" onClick={handleRedeem}>Confirmer</Button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </AppShell>
  );
}
