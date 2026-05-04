/**
 * @param {{ id: string, location?: string | null }} lead
 * @param {{ id: string, email: string, territory?: string | null }[]} users
 * @param {{ pool: import("pg").Pool }} context
 * @returns {Promise<string | null>} assignedUserId
 */
export async function assign({ lead: _lead, users, context }) {
  const { pool } = context;
  if (!users?.length) return null;

  const { rows: stateRows } = await pool.query(
    "SELECT value FROM assignment_state WHERE id = 'round_robin_index' LIMIT 1"
  );
  const currentIndex = Number(stateRows[0]?.value || 0);
  const assignee = users[currentIndex % users.length];
  const nextIndex = (currentIndex + 1) % users.length;

  await pool.query(
    "UPDATE assignment_state SET value = $1, updated_at = NOW() WHERE id = 'round_robin_index'",
    [nextIndex]
  );

  return assignee.id;
}
