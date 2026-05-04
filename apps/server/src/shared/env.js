import dotenv from "dotenv";
dotenv.config();

const dbHost = process.env.DB_HOST || "localhost";
const dbPort = Number(process.env.DB_PORT || 5432);
const dbUser = process.env.DB_USER || "postgres";
const dbPassword = process.env.DB_PASSWORD || "postgres";
const dbName = process.env.DB_NAME || "propninja";
const fallbackDatabaseUrl = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;

export const env = {
  PORT: Number(process.env.PORT || 4000),
  DATABASE_URL: process.env.DATABASE_URL || fallbackDatabaseUrl,
  REDIS_URL: process.env.REDIS_URL,
  JWT_SECRET: process.env.JWT_SECRET || "change_me_jwt",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL,
  SALES_ALERT_PHONE: process.env.SALES_ALERT_PHONE,
  ASSIGNMENT_OVERLOAD_THRESHOLD: process.env.ASSIGNMENT_OVERLOAD_THRESHOLD
    ? Number(process.env.ASSIGNMENT_OVERLOAD_THRESHOLD)
    : null,
  VAPI_API_KEY: process.env.VAPI_API_KEY,
  VAPI_BASE_URL: process.env.VAPI_BASE_URL || "https://api.vapi.ai",
  WATI_API_KEY: process.env.WATI_API_KEY,
  WATI_BASE_URL: process.env.WATI_BASE_URL || "https://live-server-0000.wati.io",
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || "change_me",
  /** Exotel Phase 1: Connect API + StatusCallback webhook */
  EXOTEL_API_KEY: process.env.EXOTEL_API_KEY,
  EXOTEL_API_TOKEN: process.env.EXOTEL_API_TOKEN,
  EXOTEL_SID: process.env.EXOTEL_SID,
  EXOTEL_BASE_URL: process.env.EXOTEL_BASE_URL || "https://api.exotel.com/v1/Accounts",
  EXOTEL_CALLER_ID: process.env.EXOTEL_CALLER_ID,
  /** Applet URL (Exotel flow / gather IVR XML/voice applet) */
  EXOTEL_FLOW_URL: process.env.EXOTEL_FLOW_URL,
  /** Full URL e.g. https://YOUR_DOMAIN/api/webhooks/exotel */
  EXOTEL_STATUS_CALLBACK_URL: process.env.EXOTEL_STATUS_CALLBACK_URL
};
