import axios from "axios";
import { env } from "../../shared/env.js";

const client = axios.create({
  baseURL: env.WATI_BASE_URL,
  headers: { Authorization: env.WATI_API_KEY || "", "Content-Type": "application/json" }
});

export const watiClient = {
  async sendMessage({ phone, message }) {
    if (!env.WATI_API_KEY) return { ok: true, mock: true };
    const { data } = await client.post(`/api/v1/sendSessionMessage/${phone}`, { messageText: message });
    return data;
  }
};
