"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/prospects", label: "Prospects" },
  { href: "/leads", label: "Leads" },
  { href: "/uploads", label: "Uploads" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/assignment", label: "Assignment" },
  { href: "/sales", label: "Sales" },
  { href: "/notifications", label: "Notifications" },
  { href: "/settings", label: "Settings" }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { role } = useAuth();
  const hideShell = pathname === "/login" || pathname === "/403";

  if (hideShell) return <>{children}</>;

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <aside className="hidden w-64 bg-slate-900 p-4 text-slate-100 md:block">
        <div className="mb-6 rounded-xl bg-slate-800 p-3">
          <div className="text-xs text-slate-400">PropNinja</div>
          <div className="text-lg font-semibold">Admin Console</div>
          <div className="mt-1 text-xs text-indigo-300">{role || "Unknown role"}</div>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm transition ${
                  active ? "bg-indigo-600 text-white" : "text-slate-200 hover:bg-slate-800"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 bg-transparent">{children}</main>
    </div>
  );
}
