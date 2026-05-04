import pg from "pg";
import { env } from "../../shared/env.js";

const { Pool } = pg;

function poolConfig() {
  const connectionString = env.DATABASE_URL;
  if (!connectionString) {
    return { connectionString };
  }

  const sslOverride = process.env.DATABASE_SSL?.toLowerCase();
  if (sslOverride === "false" || sslOverride === "0") {
    return { connectionString };
  }

  const needsSsl =
    sslOverride === "true" ||
    sslOverride === "1" ||
    /[?&]sslmode=(require|verify-ca|verify-full)/i.test(connectionString) ||
    /\.render\.com\b/i.test(connectionString);

  if (!needsSsl) {
    return { connectionString };
  }

  return {
    connectionString,
    ssl: { rejectUnauthorized: false }
  };
}

export const pool = new Pool(poolConfig());
