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
import { marginByCategory as mockData } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";
import { useMarginByCategory } from "@/lib/hooks/useApi";

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
}: {
  active?: boolean;
  payload?: { value: number; name: string }[];
  label?: string;
  data: Array<{ category: string; revenue: number; margin: number; marginRate: number }>;
}) => {
  if (!active || !payload?.length) return null;
  const item = data.find((d) => d.category === label);
  return (
    <div className="bg-white border border-[var(--border)] rounded-xl shadow-[var(--shadow)] px-3 py-2.5 text-sm min-w-[160px]">
      <p className="font-semibold text-[var(--text-primary)] mb-2 text-xs">{label}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-[var(--text-muted)] text-xs">CA</span>
          <span className="font-medium tabular-nums text-xs">{formatCurrency(payload[0].value)}</span>
        </div>
        {item && (
          <>
            <div className="flex justify-between gap-4">
              <span className="text-[var(--text-muted)] text-xs">Marge</span>
              <span className="font-medium text-emerald-600 tabular-nums text-xs">
                {formatCurrency(item.margin)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[var(--text-muted)] text-xs">Taux</span>
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
  const { data: apiData } = useMarginByCategory();

  // Fallback sur mock si backend indisponible
  const data = apiData.length > 0 ? apiData : mockData;

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
        <Tooltip content={<CustomTooltip data={data} />} cursor={{ fill: "#f8fafc" }} />
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
