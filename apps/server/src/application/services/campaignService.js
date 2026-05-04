import { v4 as uuid } from "uuid";
import { pool } from "../../infrastructure/db/postgres.js";
import { workflowQueue } from "../../infrastructure/queue/queue.js";

export const campaignService = {
  async list() {
    const { rows } = await pool.query("SELECT * FROM campaigns ORDER BY created_at DESC");
    return rows;
  },

  async create(input) {
    const campaign = {
      id: uuid(),
      name: input.name,
      channel: input.channel,
      status: input.status || "draft",
      trigger_event: input.triggerEvent || null
    };

    await pool.query(
      "INSERT INTO campaigns (id, name, channel, status, trigger_event) VALUES ($1,$2,$3,$4,$5)",
      [campaign.id, campaign.name, campaign.channel, campaign.status, campaign.trigger_event]
    );

    if (campaign.status === "active" && campaign.trigger_event) {
      await workflowQueue.add("campaign-trigger", {
        trigger: campaign.trigger_event,
        payload: { campaignId: campaign.id }
      });
    }

    return campaign;
  },

  async update(id, input) {
    const { rows } = await pool.query(
      `UPDATE campaigns
       SET name = COALESCE($2, name),
           channel = COALESCE($3, channel),
           status = COALESCE($4, status),
           trigger_event = COALESCE($5, trigger_event)
       WHERE id = $1
       RETURNING *`,
      [id, input.name ?? null, input.channel ?? null, input.status ?? null, input.triggerEvent ?? null]
    );
    return rows[0] || null;
  },

  async remove(id) {
    const { rowCount } = await pool.query("DELETE FROM campaigns WHERE id = $1", [id]);
    return rowCount > 0;
  },

  async getBuilderForTrigger(triggerEvent) {
    const { rows } = await pool.query(
      `SELECT id, name, trigger_event, steps, status, assignment_strategy, created_at
       FROM campaign_builders
       WHERE trigger_event = $1 AND status = 'active'
       ORDER BY created_at DESC
       LIMIT 1`,
      [triggerEvent]
    );
    return rows[0] || null;
  },

  async listBuilders() {
    const { rows } = await pool.query(
      `SELECT id, name, trigger_event, steps, status, assignment_strategy, created_at
       FROM campaign_builders
       ORDER BY created_at DESC`
    );
    return rows;
  },

  async createBuilder(input) {
    const assignmentRaw = input.assignment_strategy ?? "round_robin";
    const builder = {
      id: uuid(),
      name: input.name,
      trigger_event: input.trigger,
      steps: input.steps,
      status: input.status || "active",
      assignment_strategy: assignmentRaw
    };

    await pool.query(
      `INSERT INTO campaign_builders (id, name, trigger_event, steps, status, assignment_strategy)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        builder.id,
        builder.name,
        builder.trigger_event,
        JSON.stringify(builder.steps),
        builder.status,
        builder.assignment_strategy
      ]
    );

    await pool.query(
      `INSERT INTO workflow_definitions (id, trigger_event, steps, is_active)
       VALUES (uuid_generate_v4(), $1, $2, $3)
       ON CONFLICT (trigger_event)
       DO UPDATE SET steps = EXCLUDED.steps, is_active = EXCLUDED.is_active`,
      [builder.trigger_event, JSON.stringify(builder.steps), builder.status === "active"]
    );

    return builder;
  },

  async updateBuilder(id, input) {
    const status = input.status ?? null;
    const assignment = input.assignment_strategy ?? null;
    const trigger = input.trigger ?? null;
    const steps = input.steps ? JSON.stringify(input.steps) : null;
    const { rows } = await pool.query(
      `UPDATE campaign_builders
       SET name = COALESCE($2, name),
           trigger_event = COALESCE($3, trigger_event),
           steps = COALESCE($4::jsonb, steps),
           status = COALESCE($5, status),
           assignment_strategy = COALESCE($6::jsonb, assignment_strategy)
       WHERE id = $1
       RETURNING *`,
      [id, input.name ?? null, trigger, steps, status, assignment ? JSON.stringify(assignment) : null]
    );
    return rows[0] || null;
  },

  async removeBuilder(id) {
    const { rowCount } = await pool.query("DELETE FROM campaign_builders WHERE id = $1", [id]);
    return rowCount > 0;
  },

  async compare() {
    const query = `
      WITH calling AS (
        SELECT
          COUNT(*) FILTER (WHERE event_type = 'upload.calling.processed')::numeric AS total,
          COUNT(*) FILTER (WHERE event_type = 'lead.converted' AND metadata->>'channel' = 'calling')::numeric AS converted
        FROM metrics_events
      ),
      whatsapp AS (
        SELECT
          COUNT(*) FILTER (WHERE event_type = 'upload.whatsapp.processed')::numeric AS total,
          COUNT(*) FILTER (WHERE event_type = 'lead.converted' AND metadata->>'channel' = 'whatsapp')::numeric AS converted
        FROM metrics_events
      )
      SELECT
        ROUND((calling.converted / NULLIF(calling.total, 0)) * 100, 2) AS calling_conversion,
        ROUND((whatsapp.converted / NULLIF(whatsapp.total, 0)) * 100, 2) AS whatsapp_conversion
      FROM calling, whatsapp
    `;
    const { rows } = await pool.query(query);
    return {
      calling: { conversion: Number(rows[0]?.calling_conversion || 0) },
      whatsapp: { conversion: Number(rows[0]?.whatsapp_conversion || 0) }
    };
  },

  async performance() {
    const { rows } = await pool.query(
      `SELECT
         u.campaign AS campaign,
         COUNT(DISTINCT CASE WHEN u.type = 'calling' THEN l.id END) AS leads,
         COUNT(*) FILTER (WHERE m.event_type = 'call.triggered') AS calls,
         COUNT(*) FILTER (WHERE m.event_type = 'call.interested') AS interested,
         COUNT(*) FILTER (WHERE m.event_type = 'lead.site_visit') AS visits,
         COUNT(*) FILTER (WHERE m.event_type = 'lead.converted') AS closures,
         COALESCE(SUM(CASE WHEN m.event_type = 'lead.revenue' THEN m.value ELSE 0 END), 0) AS revenue
       FROM uploads u
       LEFT JOIN leads l ON u.campaign = ANY(l.campaigns)
       LEFT JOIN metrics_events m ON m.metadata->>'campaign' = u.campaign
       GROUP BY u.campaign
       ORDER BY u.campaign ASC`
    );
    return rows.map((r) => ({
      campaign: r.campaign,
      leads: Number(r.leads || 0),
      calls: Number(r.calls || 0),
      interested: Number(r.interested || 0),
      visits: Number(r.visits || 0),
      closures: Number(r.closures || 0),
      revenue: Number(r.revenue || 0)
    }));
  }
};
