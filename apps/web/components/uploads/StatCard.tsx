"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  gradient: "indigo" | "blue" | "violet" | "emerald";
};

const gradients: Record<StatCardProps["gradient"], string> = {
  indigo: "from-indigo-600 via-blue-600 to-indigo-700",
  blue: "from-blue-600 via-indigo-600 to-blue-700",
  violet: "from-violet-600 via-purple-600 to-indigo-700",
  emerald: "from-emerald-500 via-teal-500 to-cyan-600"
};

export function StatCard({ label, value, icon: Icon, gradient }: StatCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl p-6 text-white shadow-lg transition-transform duration-300 hover:scale-[1.02] hover:shadow-xl",
        "bg-gradient-to-br",
        gradients[gradient]
      )}
    >
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" aria-hidden />
      <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-black/10 blur-2xl" aria-hidden />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white/85">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">{value}</p>
        </div>
        <div className="rounded-xl bg-white/15 p-3 backdrop-blur-sm">
          <Icon className="h-6 w-6 text-white" aria-hidden />
        </div>
      </div>
    </div>
  );
}
