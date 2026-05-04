import axios from "axios";
import { env } from "../../shared/env.js";
import { generateCallScript as localScriptGenerator } from "./aiCallScript.js";

const client = axios.create({
  baseURL: env.OPENAI_BASE_URL,
  headers: {
    Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    "Content-Type": "application/json"
  }
});

const fallback = {
  async scoreLead(lead) {
    const budget = Number(lead?.budget || 0);
    if (budget >= 15000000) return { score: 92, tier: "HOT" };
    if (budget >= 8000000) return { score: 72, tier: "WARM" };
    return { score: 45, tier: "COLD" };
  },
  async generateCallScript(input) {
    const segment = input.segment || "end-user";
    const style =
      segment === "investor"
        ? "ROI focused"
        : segment === "budget-sensitive"
          ? "value focused"
          : "lifestyle focused";
    return `Pitch for ${input.segment || "buyer"} with budget ${input.budget || "N/A"} in ${
      input.location || "target area"
    }. Tone: ${style}.`;
  },
  async personalizeWhatsapp(input) {
    const tone = input.tone || "informational";
    const prefix = tone === "urgent" ? "Fast update:" : tone === "luxury" ? "Exclusive update:" : "Hi";
    return `Hi ${input.name || "there"}, based on your interest in ${
      input.location || "your selected location"
    }, we found matching opportunities for your budget. ${prefix}`;
  }
};

async function complete(prompt) {
  if (!env.OPENAI_API_KEY) return null;
  const { data } = await client.post("/chat/completions", {
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3
  });
  return data?.choices?.[0]?.message?.content || null;
}

export const aiService = {
  async scoreLead(lead) {
    const response = await complete(
      `Return JSON only {"score":number,"tier":"HOT|WARM|COLD"} for this lead: ${JSON.stringify(lead)}`
    );
    if (!response) return fallback.scoreLead(lead);
    try {
      const parsed = JSON.parse(response);
      if (typeof parsed.score === "number" && typeof parsed.tier === "string") return parsed;
    } catch (_error) {
      return fallback.scoreLead(lead);
    }
    return fallback.scoreLead(lead);
  },

  async generateCallScript(input) {
    const response = await complete(
      `Create a concise real-estate sales call script based on ${JSON.stringify(input)}`
    );
    return response || (await localScriptGenerator(input)) || fallback.generateCallScript(input);
  },

  async personalizeWhatsapp(input) {
    const response = await complete(
      `Write a personalized WhatsApp message for this lead ${JSON.stringify(input)}`
    );
    return response || fallback.personalizeWhatsapp(input);
  }
};
