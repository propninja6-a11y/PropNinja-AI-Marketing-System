import { workflowQueue } from "../../infrastructure/queue/queue.js";
import { pool } from "../../infrastructure/db/postgres.js";
import {
  isWebhookEventProcessed,
  markWebhookEventProcessed
} from "../../infrastructure/webhooks/webhookEvents.js";
import { promoteProspectToLead } from "./prospectPromotionService.js";
import { normalizePhone } from "../../shared/phone.js";
import { runAIFlow } from "../ai/aiDecision.js";
import { logger } from "../../shared/logger.js";
import { metricsService } from "./metricsService.js";

function callIndicatesInterest(body) {
  const m = body.metadata || {};
  if (m.interested === true || m.qualifyLead === true || m.leadQualified === true) return true;
  const summary = String(
    body.analysis?.summary ||
      body.message?.analysis?.summary ||
      body.transcriptSummary ||
      body.summary ||
      ""
  ).toLowerCase();
  if (!summary.trim()) return false;
  return /\b(interested|qualified|want to (buy|schedule)|schedule (a )?(visit|call)|callback|hot lead)\b/.test(
    summary
  );
}

function parseWatiInbound(body) {
  if (!body || typeof body !== "object") return null;
  const fromMe = body.fromMe === true || body.owner === true || body.isFromMe === true;
  if (fromMe) return null;

  const text = body.text || body.messageText || body.body || body.message?.text;
  if (!text || !String(text).trim()) return null;

  const rawPhone =
    body.waId ||
    body.whatsappNumber ||
    body.mobile ||
    body.phone ||
    body.senderPhone ||
    body.from ||
    body.wid?.user;

  if (!rawPhone) return null;

  const direction = String(body.direction || body.type || "").toLowerCase();
  const eventLabel = String(body.eventType || body.event || "");
  const looksInbound =
    direction === "inbound" ||
    direction === "incoming" ||
    /message_received|incoming|session_message/i.test(eventLabel) ||
    (!fromMe && Boolean(text));

  if (!looksInbound) return null;

  return { phone: normalizePhone(rawPhone), text: String(text).trim() };
}

export const webhookIngestService = {
  async ingestVapi(body) {
    const eventId = body.eventId || body.callId;
    if (!eventId) {
      return { duplicate: false, enqueued: false, skipped: true, reason: "missing_event_id" };
    }

    if (await isWebhookEventProcessed("vapi", eventId)) {
      return { duplicate: true, enqueued: false };
    }

    let enqueued = false;
    if (body.status === "completed") {
      const externalCallId = body.callId || body.id || body.message?.call?.id || eventId;
      let leadId = body.metadata?.leadId || null;
      let phone = body.metadata?.phone || body.customer?.number || null;

      const { rows } = await pool.query(
        `SELECT lead_id, prospect_id FROM calls WHERE external_call_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [externalCallId]
      );
      const callRow = rows[0];
      if (callRow) {
        if (!leadId && callRow.lead_id) leadId = callRow.lead_id;
        if (callRow.prospect_id && !leadId && callIndicatesInterest(body)) {
          const promoted = await promoteProspectToLead(callRow.prospect_id, {
            signal: "vapi_call_completed",
            snippet: body.transcript || body.analysis?.summary || ""
          });
          if (promoted?.leadId) {
            leadId = promoted.leadId;
            await pool.query(`UPDATE calls SET lead_id = $1 WHERE external_call_id = $2`, [
              leadId,
              externalCallId
            ]);
          }
        }
      }

      if (leadId) {
        await workflowQueue.add("call-completed", {
          trigger: "CALL_COMPLETED",
          payload: { leadId, phone }
        });
        enqueued = true;
      }
    }

    await markWebhookEventProcessed("vapi", eventId, body);
    return { duplicate: false, enqueued };
  },

  async ingestWati(body) {
    const inbound = parseWatiInbound(body);
    if (!inbound?.phone) {
      return { promoted: false, skipped: true };
    }

    const { rows } = await pool.query(
      `SELECT id FROM prospects WHERE phone = $1 AND promoted_lead_id IS NULL LIMIT 1`,
      [inbound.phone]
    );
    if (!rows.length) {
      return { promoted: false, skipped: true, reason: "no_open_prospect" };
    }

    await promoteProspectToLead(rows[0].id, {
      signal: "whatsapp_inbound",
      snippet: inbound.text
    });
    return { promoted: true };
  },

  /**
   * Exotel status / gather callback (form body: CallSid, CallStatus, Digits, CustomField).
   */
  async ingestExotel(body) {
    const CallSid = body.CallSid || body.Sid || body.ParentCallSid;
    const CallStatus = String(body.CallStatus || body.Status || "");
    const digitStr =
      body.Digits != null && String(body.Digits).trim() !== ""
        ? String(body.Digits).trim()
        : "";

    logger.info(
      {
        event: "webhook_received",
        provider: "exotel",
        callSid: CallSid,
        callStatus: CallStatus,
        digits: digitStr || undefined
      },
      "webhook_received"
    );

    if (!CallSid) {
      return { skipped: true, reason: "missing_call_sid" };
    }

    let leadId = null;
    let prospectId = null;
    let campaign = null;

    try {
      const cf = JSON.parse(body.CustomField || body.custom_field || "{}");
      leadId = cf.leadId || null;
      prospectId = cf.prospectId || null;
      campaign = cf.campaign || null;
    } catch {
      // ignore invalid CustomField
    }

    const { rows: callRows } = await pool.query(
      `SELECT lead_id, prospect_id FROM calls WHERE external_call_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [CallSid]
    );
    const callLookup = callRows[0];
    if (callLookup) {
      leadId = leadId || callLookup.lead_id;
      prospectId = prospectId || callLookup.prospect_id;
    }

    await pool.query(
      `UPDATE calls
       SET status = $2::text,
           transcript = CASE WHEN $3::text <> '' THEN $3 ELSE transcript END
       WHERE external_call_id = $1`,
      [CallSid, CallStatus || "unknown", digitStr ? `DTMF:${digitStr}` : null]
    );

    const warrantsDecision =
      Boolean(digitStr) || /\bcompleted\b/i.test(CallStatus || "") || /\bterminal\b/i.test(CallStatus || "");

    if (!warrantsDecision || (!leadId && !prospectId)) {
      await metricsService.track("exotel.callback", 1, {
        callSid: CallSid,
        callStatus: CallStatus,
        skipped: true
      });
      return { skipped: true, reason: warrantsDecision ? "missing_lead_scope" : "non_terminal_phase" };
    }

    const decisionEventId = `${CallSid}:${digitStr ? `D:${digitStr}` : `S:${CallStatus || "completed"}`}`;

    if (await isWebhookEventProcessed("exotel", decisionEventId)) {
      return { duplicate: true };
    }

    let outcome = "unknown";
    if (digitStr.startsWith("1")) outcome = "interested";
    else if (digitStr.startsWith("2")) outcome = "not_interested";

    if (leadId) {
      await pool.query(
        `UPDATE leads
         SET ivr_outcome = $2,
             ivr_digits = COALESCE(NULLIF($3::text,''), ivr_digits),
             ivr_last_call_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [leadId, outcome, digitStr]
      );

      logger.info(
        {
          event: "call_status_update",
          provider: "exotel",
          callSid: CallSid,
          leadId,
          outcome,
          digits: digitStr || null,
          campaign
        },
        "call_status_update"
      );
    } else if (prospectId) {
      logger.info(
        {
          event: "call_status_update",
          provider: "exotel",
          callSid: CallSid,
          prospectId,
          outcome,
          digits: digitStr || null,
          campaign
        },
        "call_status_update"
      );
    }

    await metricsService.track("exotel.ivr.branch", 1, {
      callSid: CallSid,
      leadId,
      prospectId,
      outcome,
      campaign,
      digits: digitStr || null,
      status: CallStatus
    });

    await runAIFlow({
      leadId,
      prospectId,
      outcome,
      callSid: CallSid,
      digits: digitStr
    });

    await markWebhookEventProcessed("exotel", decisionEventId, body);

    return { duplicate: false, processed: true, outcome };
  }
};
