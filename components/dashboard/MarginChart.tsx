"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { useMarginByCategory } from "@/lib/hooks/useApi";
import { useI18n } from "@/lib/i18n/context";

const COLORS = [
  "#1a56db",
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#0ea5e9",
];

const CustomTooltip = ({
  active,
  payload,
  label,
  data,
  labels,
}: {
  active?: boolean;
  payload?: { value: number; name: string }[];
  label?: string;
  data: Array<{ category: string; revenue: number; margin: number; marginRate: number }>;
  labels: { revenue: string; margin: string; rate: string };
}) => {
  if (!active || !payload?.length) return null;
  const item = data.find((d) => d.category === label);
  return (
    <div className="bg-white border border-[var(--border)] rounded-xl shadow-[var(--shadow)] px-3 py-2.5 text-sm min-w-[160px]">
      <p className="font-semibold text-[var(--text-primary)] mb-2 text-xs">{label}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-[var(--text-muted)] text-xs">{labels.revenue}</span>
          <span className="font-medium tabular-nums text-xs">{formatCurrency(payload[0].value)}</span>
        </div>
        {item && (
          <>
            <div className="flex justify-between gap-4">
              <span className="text-[var(--text-muted)] text-xs">{labels.margin}</span>
              <span className="font-medium text-emerald-600 tabular-nums text-xs">
                {formatCurrency(item.margin)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[var(--text-muted)] text-xs">{labels.rate}</span>
              <span className="font-bold text-[var(--brand)] tabular-nums text-xs">
                {item.marginRate}%
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export function MarginChart() {
  const { t } = useI18n();
  const { data: apiData } = useMarginByCategory();

  // Données réelles uniquement
  const data = apiData;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={data}
        margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
        barSize={28}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="category"
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          interval={0}
          tickFormatter={(v: string) => v.split(" ")[0]}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<CustomTooltip data={data} labels={{ revenue: t.charts.revenue, margin: t.charts.margin, rate: t.charts.rate }} />} cursor={{ fill: "#f8fafc" }} />
        <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
          {data.map((_, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORS[index % COLORS.length]}
              fillOpacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
