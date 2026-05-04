import { v4 as uuid } from "uuid";
import { pool } from "../../infrastructure/db/postgres.js";
import { normalizePhone } from "../../shared/phone.js";
import { assignmentService } from "./assignmentService.js";
import { metricsService } from "./metricsService.js";

const addUnique = (arr, value) => Array.from(new Set([...(arr || []), value]));

async function findLeadByNormalizedPhone(phoneDigits) {
  const { rows } = await pool.query(
    `SELECT * FROM leads
     WHERE regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = $1
     LIMIT 1`,
    [phoneDigits]
  );
  return rows[0] || null;
}

export async function promoteProspectToLead(prospectId, { signal = "unknown", snippet = null } = {}) {
  const { rows } = await pool.query(`SELECT * FROM prospects WHERE id = $1 LIMIT 1`, [prospectId]);
  const prospect = rows[0];
  if (!prospect) return null;
  if (prospect.promoted_lead_id) {
    return { leadId: prospect.promoted_lead_id, alreadyPromoted: true };
  }

  const digits = normalizePhone(prospect.phone);
  const existingLead = await findLeadByNormalizedPhone(digits);

  let leadId;
  if (existingLead) {
    leadId = existingLead.id;
    const channels = addUnique(existingLead.channels, prospect.source);
    const campaigns = addUnique(existingLead.campaigns, prospect.campaign);
    await pool.query(
      `UPDATE leads
       SET stage = CASE WHEN stage IN ('CLOSED','LOST') THEN stage ELSE 'INTERESTED' END,
           name = COALESCE(NULLIF($1, ''), name),
           location = COALESCE(NULLIF($2, ''), location),
           email = COALESCE($3, email),
           source = COALESCE($4, source),
           channels = $5,
           campaigns = $6,
           campaign = COALESCE($7, campaign),
           budget = COALESCE($8, budget),
           updated_at = NOW()
       WHERE id = $9`,
      [
        prospect.name,
        prospect.location,
        prospect.email,
        prospect.source,
        channels,
        campaigns,
        prospect.campaign,
        prospect.budget ?? null,
        leadId
      ]
    );
  } else {
    leadId = uuid();
    await pool.query(
      `INSERT INTO leads
       (id, name, phone, email, source, status, location, campaign, channels, campaigns, budget, stage, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,'new',$6,$7,$8,$9,$10,'INTERESTED',NOW(),NOW())`,
      [
        leadId,
        prospect.name,
        prospect.phone,
        prospect.email,
        prospect.source || "outreach",
        prospect.location,
        prospect.campaign,
        [prospect.source || "outreach"],
        prospect.campaign ? [prospect.campaign] : [],
        prospect.budget ?? null
      ]
    );
  }

  await pool.query(
    `UPDATE prospects
     SET promoted_lead_id = $1, promoted_at = NOW(), outreach_status = 'qualified', updated_at = NOW()
     WHERE id = $2`,
    [leadId, prospectId]
  );

  await assignmentService.assignLead({
    leadId,
    strategy: "round_robin",
    lead: {
      name: prospect.name,
      phone: prospect.phone,
      location: prospect.location,
      email: prospect.email,
      source: prospect.source
    }
  });

  await metricsService.track("prospect.promoted", 1, {
    prospectId,
    leadId,
    signal,
    snippet: snippet ? String(snippet).slice(0, 200) : null
  });

  return { leadId, alreadyPromoted: false };
}
