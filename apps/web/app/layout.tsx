import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { AuthProvider } from "../components/providers/AuthProvider";
import { AppShell } from "../components/layout/AppShell";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "PropNinja AI Marketing System",
  description: "Bulk Upload & Retry Management"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 antialiased">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
        <Toaster richColors position="top-right" closeButton />
      </body>
    </html>
  );
}
