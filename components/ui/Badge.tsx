import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "neutral";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  default: "bg-[var(--brand-light)] text-[var(--brand-dark)]",
  success: "bg-[var(--success-light)] text-emerald-700",
  warning: "bg-[var(--warning-light)] text-amber-700",
  danger: "bg-[var(--danger-light)] text-red-700",
  info: "bg-[var(--info-light)] text-indigo-700",
  neutral: "bg-slate-100 text-slate-600",
};

export function Badge({ children, variant = "default", size = "md", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-0.5 text-xs",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
