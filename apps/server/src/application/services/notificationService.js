import axios from "axios";
import { env } from "../../shared/env.js";
import { watiClient } from "../../infrastructure/integrations/watiClient.js";
import { logger } from "../../shared/logger.js";

export const notificationService = {
  async notifyHotLead({ lead, assignment, score }) {
    const text = `Hot lead detected: ${lead.name} (${lead.phone}), score ${score}. Assigned to ${assignment?.userEmail || "unassigned"}.`;

    if (env.SLACK_WEBHOOK_URL) {
      await axios.post(env.SLACK_WEBHOOK_URL, { text });
    }

    if (env.SALES_ALERT_PHONE) {
      try {
        await watiClient.sendMessage({ phone: env.SALES_ALERT_PHONE, message: text });
      } catch (error) {
        logger.warn({ err: error.message }, "sales_whatsapp_notification_failed");
      }
    }
  },

  async notifySalesManager(text) {
    if (env.SLACK_WEBHOOK_URL) {
      await axios.post(env.SLACK_WEBHOOK_URL, { text: `[SLA ALERT] ${text}` });
    }
  }
};
