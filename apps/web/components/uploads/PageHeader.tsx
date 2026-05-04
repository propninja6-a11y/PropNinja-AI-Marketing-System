"use client";

import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

type PageHeaderProps = {
  title: string;
  subtitle: string;
  actions?: ReactNode;
};

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-6 border-b border-slate-200/80 pb-8 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-600 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white shadow-md">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Live
        </div>
        <h1 className="bg-gradient-to-r from-indigo-700 via-blue-700 to-violet-700 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
          {title}
        </h1>
        <p className="max-w-2xl text-base text-slate-600">{subtitle}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}
