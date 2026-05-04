/** Normalize to digits-only for matching across uploads and provider payloads. */
export function normalizePhone(raw) {
  if (raw == null || raw === "") return "";
  return String(raw).replace(/\D/g, "");
}

/** Indian mobile with country code 91: exactly 12 digits, subscriber starts 6–9. */
export function assertIndianMobile91(raw) {
  const digits = normalizePhone(raw);
  if (!/^91[6-9]\d{9}$/.test(digits)) {
    throw new Error("Invalid phone: expected 91XXXXXXXXXX (12 digits, Indian mobile)");
  }
  return digits;
}

/** Exotel `To` field: 10-digit national mobile is common; strip leading 91 if present. */
export function formatExotelTo(raw) {
  let d = normalizePhone(raw);
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (!/^[6-9]\d{9}$/.test(d)) {
    throw new Error("Invalid phone for Exotel: need 10-digit Indian mobile or 91XXXXXXXXXX");
  }
  return d;
}
