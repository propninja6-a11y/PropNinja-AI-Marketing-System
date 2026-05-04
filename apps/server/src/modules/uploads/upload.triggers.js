import { callService } from "../../application/services/callService.js";
import { whatsappService } from "../../application/services/whatsappService.js";
import { pool } from "../../infrastructure/db/postgres.js";

async function getProspect(prospectId) {
  const { rows } = await pool.query("SELECT * FROM prospects WHERE id = $1 LIMIT 1", [prospectId]);
  return rows[0] || null;
}

export async function triggerCalling(prospectId, campaign) {
  const prospect = await getProspect(prospectId);
  if (!prospect) return;
  await callService.startCall({
    prospectId,
    phone: prospect.phone,
    name: prospect.name,
    location: prospect.location,
    budget: prospect.budget,
    campaign
  });
}

export async function triggerWhatsApp(prospectId, campaign, template) {
  const prospect = await getProspect(prospectId);
  if (!prospect) return;
  await whatsappService.sendWelcome({
    prospectId,
    phone: prospect.phone,
    name: prospect.name,
    location: prospect.location,
    template,
    campaign
  });
}
