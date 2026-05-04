import { Worker } from "bullmq";
import { redisConnection } from "../infrastructure/queue/queue.js";
import { upsertLead } from "../modules/leads/dedup.service.js";
import { triggerCalling, triggerWhatsApp } from "../modules/uploads/upload.triggers.js";

export function startUploadWorker() {
  return new Worker(
    "upload-processing",
    async (job) => {
      const { lead, type, campaign } = job.data;
      const leadId = await upsertLead(lead);
      if (type === "calling") {
        await triggerCalling(leadId, campaign);
      } else {
        await triggerWhatsApp(leadId, campaign, lead.template);
      }
    },
    { connection: redisConnection }
  );
}
