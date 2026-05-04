import { v4 as uuid } from "uuid";
import { pool } from "../../infrastructure/db/postgres.js";
import { watiClient } from "../../infrastructure/integrations/watiClient.js";
import { aiService } from "../ai/aiService.js";
import { metricsService } from "./metricsService.js";
import { slaService } from "./slaService.js";

export const whatsappService = {
  async sendWelcome(payload) {
    const { leadId, prospectId, phone, name, location, simulation } = payload;

    if (simulation?.scenario === "wati_down") {
      throw new Error("Simulated WATI failure");
    }

    if (simulation?.scenario === "partial_failure") {
      await metricsService.track("whatsapp.sent", 1, {
        leadId,
        prospectId,
        type: "welcome",
        simulationRunId: simulation.runId,
        simulated: true,
        pipeline: "partial_failure"
      });
      return;
    }

    if (simulation?.scenario === "high_load") {
      await metricsService.track("whatsapp.sent", 1, {
        leadId,
        prospectId,
        type: "welcome",
        simulated: true,
        simulationRunId: simulation.runId,
        index: simulation.index
      });
      return;
    }

    if (simulation?.scenario === "vapi_delay") {
      await metricsService.track("whatsapp.sent", 1, {
        leadId,
        prospectId,
        type: "welcome",
        simulated: true,
        simulationRunId: simulation.runId,
        pipeline: "vapi_delay"
      });
      return;
    }

    const content = await aiService.personalizeWhatsapp({
      name,
      location,
      tone: payload.whatsappTone || "informational"
    });

    await watiClient.sendMessage({ phone, message: content });
    await pool.query(
      "INSERT INTO whatsapp_messages (id, lead_id, prospect_id, direction, content, status) VALUES ($1,$2,$3,$4,$5,$6)",
      [uuid(), leadId || null, prospectId || null, "outbound", content, "sent"]
    );
    if (leadId) {
      await slaService.markContacted(leadId);
    }
    await metricsService.track("whatsapp.sent", 1, {
      leadId,
      prospectId,
      type: "welcome",
      simulationRunId: simulation?.runId,
      campaign: payload.campaign || null
    });
  },

  async sendFollowUp(payload) {
    const { leadId, phone, simulation } = payload;

    if (simulation?.scenario === "partial_failure") {
      await metricsService.track("whatsapp.sent", 1, {
        leadId,
        type: "followup",
        simulationRunId: simulation.runId,
        simulated: true,
        pipeline: "partial_failure_nurture"
      });
      return;
    }

    if (simulation?.scenario === "high_load") {
      await metricsService.track("whatsapp.sent", 1, {
        leadId,
        type: "followup",
        simulated: true,
        simulationRunId: simulation.runId,
        index: simulation.index
      });
      return;
    }

    if (simulation?.scenario === "vapi_delay") {
      await metricsService.track("whatsapp.sent", 1, {
        leadId,
        type: "followup",
        simulated: true,
        simulationRunId: simulation.runId,
        pipeline: "vapi_delay"
      });
      return;
    }

    if (!leadId) {
      return;
    }

    const content = "Your call is complete. Reply here for next steps.";
    await watiClient.sendMessage({ phone, message: content });
    await pool.query(
      "INSERT INTO whatsapp_messages (id, lead_id, prospect_id, direction, content, status) VALUES ($1,$2,$3,$4,$5,$6)",
      [uuid(), leadId, payload.prospectId || null, "outbound", content, "sent"]
    );
    if (leadId) {
      await slaService.markContacted(leadId);
    }
    await metricsService.track("whatsapp.sent", 1, {
      leadId,
      prospectId: payload.prospectId,
      type: "followup",
      simulationRunId: simulation?.runId,
      campaign: payload.campaign || null
    });
  }
};
