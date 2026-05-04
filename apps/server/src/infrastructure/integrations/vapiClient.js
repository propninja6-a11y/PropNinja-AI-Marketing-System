import axios from "axios";
import { env } from "../../shared/env.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const vapiDelayResults = new Map();

const delayDedupeKey = (simulation, phoneNumber) => {
  if (!simulation?.runId || simulation?.scenario !== "vapi_delay") return null;
  return `${simulation.runId}:${phoneNumber}`;
};

export const vapiClient = {
  async createCall({ phoneNumber, assistantId, script, simulation }) {
    if (simulation?.scenario === "vapi_delay") {
      await sleep(Number(simulation.delayMs ?? 2500));
    }

    const dedupeKey = delayDedupeKey(simulation, phoneNumber);
    if (dedupeKey && vapiDelayResults.has(dedupeKey)) {
      return vapiDelayResults.get(dedupeKey);
    }

    if (!env.VAPI_API_KEY) {
      const mock = {
        id: `mock-vapi-${simulation?.runId || Date.now()}`,
        status: "queued"
      };
      if (dedupeKey) vapiDelayResults.set(dedupeKey, mock);
      return mock;
    }

    const client = axios.create({
      baseURL: env.VAPI_BASE_URL,
      headers: { Authorization: `Bearer ${env.VAPI_API_KEY}`, "Content-Type": "application/json" }
    });

    const { data } = await client.post("/call", {
      customer: { number: phoneNumber },
      assistantId,
      assistantOverrides: script ? { firstMessage: script } : undefined
    });

    if (dedupeKey) vapiDelayResults.set(dedupeKey, data);
    return data;
  }
};
