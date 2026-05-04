"use client";

import { useEffect } from "react";

/** Root URL: static export has no server middleware; send users to login. */
export default function HomePage() {
  useEffect(() => {
    window.location.replace("/login");
  }, []);
  return (
    <p style={{ padding: "1.5rem", fontFamily: "system-ui, sans-serif" }}>
      Redirecting…
    </p>
  );
}
