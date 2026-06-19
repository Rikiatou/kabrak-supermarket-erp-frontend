"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { salesByHour as mockData } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";
import { useSalesByHour } from "@/lib/hooks/useApi";

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[var(--border)] rounded-xl shadow-[var(--shadow)] px-3 py-2.5 text-sm">
      <p className="font-semibold text-[var(--text-primary)] mb-1">{label}</p>
      <p className="text-[var(--brand)] font-medium">
        {formatCurrency(payload[0].value)}
      </p>
      {payload[1] && (
        <p className="text-[var(--text-muted)] text-xs">
          {payload[1].value} transactions
        </p>
      )}
    </div>
  );
};

export function SalesChart() {
  const { data: apiData } = useSalesByHour();

  // Fallback sur mock si backend indisponible
  const data = apiData.length > 0 ? apiData : mockData;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a56db" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#1a56db" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="hour"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          interval={1}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#e2e8f0", strokeWidth: 1 }} />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#1a56db"
          strokeWidth={2}
          fill="url(#revenueGrad)"
          dot={false}
          activeDot={{ r: 4, fill: "#1a56db", stroke: "#fff", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
