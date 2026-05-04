import { env } from "../../shared/env.js";
import { formatExotelTo } from "../../shared/phone.js";
import { logger } from "../../shared/logger.js";

function buildConnectUrl() {
  const base = (env.EXOTEL_BASE_URL || "").replace(/\/$/, "");
  const sid = env.EXOTEL_SID;
  if (!base || !sid) return null;
  return `${base}/${sid}/Calls/connect.json`;
}

export const exotelClient = {
  /**
   * @param {{ to: string, leadId?: string | null, prospectId?: string | null, campaign?: string | null }} params
   */
  async makeCall({ to, leadId, prospectId, campaign }) {
    const exoTo = formatExotelTo(to);

    const url = buildConnectUrl();
    const key = env.EXOTEL_API_KEY;
    const token = env.EXOTEL_API_TOKEN;
    const from = env.EXOTEL_CALLER_ID;
    const flowUrl = env.EXOTEL_FLOW_URL;
    const statusCallback = env.EXOTEL_STATUS_CALLBACK_URL;

    if (!url || !key || !token || !from || !flowUrl) {
      const mock = {
        Call: { Sid: `mock-exotel-${Date.now()}`, Status: "queued" },
        Sid: `mock-exotel-${Date.now()}`
      };
      logger.warn({ exoTo }, "exotel_call_skipped_missing_config_mock");
      return mock;
    }

    const auth = Buffer.from(`${key}:${token}`).toString("base64");

    const customField = JSON.stringify({
      leadId: leadId || null,
      prospectId: prospectId || null,
      campaign: campaign || null
    });

    const body = new URLSearchParams({
      From: from,
      To: exoTo,
      CallerId: from,
      Url: flowUrl,
      ...(statusCallback ? { StatusCallback: statusCallback } : {}),
      CustomField: customField
    });

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    });

    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      logger.error({ status: res.status, body: data }, "exotel_connect_failed");
      throw new Error(data?.RestException?.Message || data?.message || `Exotel HTTP ${res.status}`);
    }

    return data;
  }
};
