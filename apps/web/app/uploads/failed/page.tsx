"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FailedUploadsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/uploads#failures");
  }, [router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center bg-[#F8FAFC] p-8">
      <p className="text-sm font-medium text-slate-600">Redirecting to upload dashboard…</p>
    </div>
  );
}
