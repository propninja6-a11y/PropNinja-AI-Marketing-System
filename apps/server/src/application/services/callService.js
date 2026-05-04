import { v4 as uuid } from "uuid";
import { pool } from "../../infrastructure/db/postgres.js";
import { exotelClient } from "../../infrastructure/integrations/exotelClient.js";
import { metricsService } from "./metricsService.js";
import { slaService } from "./slaService.js";
import { logger } from "../../shared/logger.js";
import { assertIndianMobile91, normalizePhone } from "../../shared/phone.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const callService = {
  async triggerCall({ leadId, prospectId, phone, campaign }) {
    if (!phone || (!leadId && !prospectId)) {
      throw new Error("triggerCall requires phone and leadId or prospectId");
    }
    return this.startCall({
      leadId: leadId || null,
      prospectId: prospectId || null,
      phone,
      campaign
    });
  },

  async startCall(payload) {
    const { leadId, prospectId, phone, simulation } = payload;

    if (simulation?.scenario === "high_load") {
      await metricsService.track("call.triggered", 1, {
        leadId,
        prospectId,
        simulationRunId: simulation.runId,
        simulated: true,
        index: simulation.index
      });
      return { id: `sim-${simulation.index}`, leadId, prospectId, externalCallId: "high-load" };
    }

    if (simulation?.scenario === "partial_failure") {
      await metricsService.track("call.simulated_failure", 1, {
        leadId,
        prospectId,
        simulationRunId: simulation.runId
      });
      throw new Error("Simulated outbound call failure after WhatsApp success");
    }

    if (simulation?.scenario === "vapi_delay") {
      await sleep(Number(simulation.delayMs ?? 2500));
    }

    const dialPhone = assertIndianMobile91(phone);

    const apiResult = await exotelClient.makeCall({
      to: dialPhone,
      leadId,
      prospectId,
      campaign: payload.campaign || null
    });

    const externalCallId =
      apiResult?.Call?.Sid ||
      apiResult?.Sid ||
      apiResult?.call_id ||
      apiResult?.id ||
      apiResult?.request_id ||
      String(apiResult?.callId || uuid());

    const id = uuid();
    await pool.query(
      "INSERT INTO calls (id, lead_id, prospect_id, external_call_id, status, transcript) VALUES ($1,$2,$3,$4,$5,$6)",
      [id, leadId || null, prospectId || null, externalCallId, apiResult?.status || "queued", null]
    );
    if (leadId) {
      await slaService.markContacted(leadId);
    }

    logger.info(
      {
        event: "call_initiated",
        leadId,
        prospectId,
        externalCallId,
        phone: normalizePhone(dialPhone)
      },
      "call_initiated"
    );

    await metricsService.track("call.initiated", 1, {
      leadId,
      prospectId,
      callId: id,
      externalCallId,
      simulationRunId: simulation?.runId,
      campaign: payload.campaign || null
    });

    await metricsService.track("call.triggered", 1, {
      leadId,
      prospectId,
      callId: id,
      simulationRunId: simulation?.runId,
      campaign: payload.campaign || null
    });

    return { id, leadId, prospectId, externalCallId };
  }
};
