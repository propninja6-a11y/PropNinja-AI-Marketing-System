/**
 * Assign to sales user with fewest lead_assignments rows (active load proxy).
 * @param {{ id: string }} lead
 * @param {{ id: string, email: string, territory?: string | null }[]} users
 * @param {{ pool: import("pg").Pool, overloadThreshold?: number | null }} context
 * @returns {Promise<string | null>}
 */
export async function assign({ lead: _lead, users, context }) {
  const { pool, overloadThreshold } = context;
  if (!users?.length) return null;

  const ids = users.map((u) => u.id);
  const { rows } = await pool.query(
    `SELECT user_id, COUNT(*)::int AS c
     FROM lead_assignments
     WHERE user_id = ANY($1::uuid[])
     GROUP BY user_id`,
    [ids]
  );
  const counts = new Map(rows.map((r) => [r.user_id, r.c]));

  let best = users[0];
  let bestCount = counts.get(best.id) ?? 0;
  for (const u of users) {
    const c = counts.get(u.id) ?? 0;
    if (c < bestCount) {
      best = u;
      bestCount = c;
    }
  }

  if (overloadThreshold != null && bestCount >= overloadThreshold) {
    return null;
  }

  return best.id;
}
