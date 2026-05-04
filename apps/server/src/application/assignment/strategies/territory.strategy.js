/**
 * Match lead.location to user.territory (case-insensitive).
 * @param {{ id: string, location?: string | null }} lead
 * @param {{ id: string, email: string, territory?: string | null }[]} users
 * @param {{ pool?: import("pg").Pool }} context
 * @returns {Promise<string | null>}
 */
export async function assign({ lead, users, context: _context }) {
  const loc = lead.location?.trim();
  if (!loc) return null;

  const normalized = loc.toLowerCase();
  const matches = users.filter(
    (u) => u.territory && u.territory.trim().toLowerCase() === normalized
  );
  if (!matches.length) return null;

  return matches[0].id;
}
