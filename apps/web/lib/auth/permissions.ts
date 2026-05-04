const protectedPrefixes = [
  "/dashboard",
  "/uploads",
  "/prospects",
  "/leads",
  "/campaigns",
  "/assignment",
  "/sales",
  "/notifications",
  "/settings"
];

export function canRunSimulation(role: string | null) {
  return role === "Admin";
}

export function canManageCampaigns(role: string | null) {
  return role === "Admin" || role === "Manager";
}

export function canAccessRoute(role: string | null, pathname: string) {
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
  if (!isProtected) return true;
  return role === "Admin" || role === "Manager" || role === "Sales";
}
