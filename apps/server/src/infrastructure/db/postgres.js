import pg from "pg";
import { env } from "../../shared/env.js";
const { Pool } = pg;
export const pool = new Pool({ connectionString: env.DATABASE_URL });
