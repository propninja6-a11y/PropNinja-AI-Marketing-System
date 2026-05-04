import { v4 as uuid } from "uuid";
import { pool } from "../../infrastructure/db/postgres.js";
import { normalizePhone } from "../../shared/phone.js";

const addUnique = (arr, value) => Array.from(new Set([...(arr || []), value]));

export async function upsertLead(lead) {
  const existing = await pool.query("SELECT * FROM leads WHERE phone = $1 LIMIT 1", [lead.phone]);

  if (existing.rows.length > 0) {
    const existingLead = existing.rows[0];
    const channels = addUnique(existingLead.channels, lead.source);
    const campaigns = addUnique(existingLead.campaigns, lead.campaign);

    await pool.query(
      `UPDATE leads
       SET name = COALESCE(NULLIF($1, ''), name),
           location = COALESCE(NULLIF($2, ''), location),
           source = COALESCE($3, source),
           channels = $4,
           campaigns = $5,
           campaign = COALESCE($6, campaign),
           budget = COALESCE($7, budget),
           updated_at = NOW()
       WHERE id = $8`,
      [
        lead.name,
        lead.location,
        lead.source,
        channels,
        campaigns,
        lead.campaign,
        lead.budget ?? null,
        existingLead.id
      ]
    );

    return existingLead.id;
  }

  const leadId = uuid();
  await pool.query(
    `INSERT INTO leads
     (id, name, phone, location, source, campaign, channels, campaigns, budget, status, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'new',NOW(),NOW())`,
    [
      leadId,
      lead.name,
      lead.phone,
      lead.location || null,
      lead.source,
      lead.campaign || null,
      [lead.source],
      lead.campaign ? [lead.campaign] : [],
      lead.budget ?? null
    ]
  );
  return leadId;
}

/** Upsert an outreach contact (upload/campaign). Does not create CRM leads until promotion. */
export async function upsertProspect(lead) {
  const phoneDigits = normalizePhone(lead.phone);
  if (!phoneDigits) {
    throw new Error("Missing phone for prospect");
  }

  const existing = await pool.query(
    `SELECT * FROM prospects WHERE phone = $1 AND promoted_lead_id IS NULL LIMIT 1`,
    [phoneDigits]
  );

  if (existing.rows.length > 0) {
    const p = existing.rows[0];
    const channels = addUnique(p.channels, lead.source);
    const campaigns = addUnique(p.campaigns, lead.campaign);

    await pool.query(
      `UPDATE prospects
       SET name = COALESCE(NULLIF($1, ''), name),
           location = COALESCE(NULLIF($2, ''), location),
           email = COALESCE($3, email),
           source = COALESCE($4, source),
           channels = $5,
           campaigns = $6,
           campaign = COALESCE($7, campaign),
           budget = COALESCE($8, budget),
           outreach_status = CASE WHEN outreach_status = 'qualified' THEN outreach_status ELSE 'pending' END,
           updated_at = NOW()
       WHERE id = $9`,
      [
        lead.name,
        lead.location,
        lead.email ?? null,
        lead.source,
        channels,
        campaigns,
        lead.campaign,
        lead.budget ?? null,
        p.id
      ]
    );

    return p.id;
  }

  const prospectId = uuid();
  await pool.query(
    `INSERT INTO prospects
     (id, name, phone, email, location, source, campaign, channels, campaigns, budget, outreach_status, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending',NOW(),NOW())`,
    [
      prospectId,
      lead.name,
      phoneDigits,
      lead.email ?? null,
      lead.location || null,
      lead.source || "upload",
      lead.campaign || null,
      [lead.source || "upload"],
      lead.campaign ? [lead.campaign] : [],
      lead.budget ?? null
    ]
  );
  return prospectId;
}
