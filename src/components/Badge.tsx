import type { ReactNode } from "react";

/**
 * Átomo: pill de estado semántica (tema claro).
 */
export type BadgeTone = "success" | "danger" | "warning" | "neutral";

const toneClasses: Record<BadgeTone, string> = {
  success: "bg-emerald-50 text-emerald-600",
  danger: "bg-red-50 text-red-600",
  warning: "bg-orange-50 text-orange-700",
  neutral: "bg-slate-100 text-slate-600",
};

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

export default function Badge({
  tone = "neutral",
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold tracking-[0.03em] leading-[1.2] whitespace-nowrap ${toneClasses[tone]} ${className || ""}`}
    >
      {children}
    </span>
  );
}
