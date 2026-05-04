import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { pool } from "./postgres.js";

async function upsertUser({ email, role, territory = null, isActive = true, password = "Password@123" }) {
  const passwordHash = await bcrypt.hash(password, 10);
  const id = uuid();
  await pool.query(
    `INSERT INTO users (id, email, password_hash, role, territory, is_active)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (email)
     DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       role = EXCLUDED.role,
       territory = EXCLUDED.territory,
       is_active = EXCLUDED.is_active`,
    [id, email, passwordHash, role, territory, isActive]
  );
}

async function upsertSetting(key, value, updatedBy = null) {
  await pool.query(
    `INSERT INTO admin_settings (key, value, updated_by)
     VALUES ($1, $2, $3)
     ON CONFLICT (key)
     DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
    [key, JSON.stringify(value), updatedBy]
  );
}

async function insertNotification({ type, title, message, severity = "info", metadata = {} }) {
  await pool.query(
    `INSERT INTO admin_notifications (id, type, title, message, severity, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [uuid(), type, title, message, severity, JSON.stringify(metadata)]
  );
}

async function seedAdmin() {
  console.log("Seeding admin users, settings, and notifications...");

  await upsertUser({ email: "admin@propninja.ai", role: "Admin", territory: "HQ", password: "Admin@12345" });
  await upsertUser({ email: "manager@propninja.ai", role: "Manager", territory: "Bangalore" });
  await upsertUser({ email: "sales1@propninja.ai", role: "Sales", territory: "North Bangalore" });
  await upsertUser({ email: "sales2@propninja.ai", role: "Sales", territory: "East Bangalore" });

  const adminUser = await pool.query("SELECT id FROM users WHERE email = $1 LIMIT 1", ["admin@propninja.ai"]);
  const adminId = adminUser.rows[0]?.id || null;

  await upsertSetting("VAPI_API_KEY", "demo_vapi_key", adminId);
  await upsertSetting("WATI_API_KEY", "demo_wati_key", adminId);
  await upsertSetting("OPENAI_API_KEY", "demo_openai_key", adminId);
  await upsertSetting("SALES_ALERT_CHANNEL", "slack://sales-alerts", adminId);

  await insertNotification({
    type: "system_status",
    title: "Admin Console Ready",
    message: "Admin seed completed successfully. Review settings and user assignments.",
    severity: "info"
  });
  await insertNotification({
    type: "sla_alert",
    title: "SLA Watch",
    message: "3 leads are nearing response SLA threshold.",
    severity: "warning",
    metadata: { leadsAtRisk: 3 }
  });
  await insertNotification({
    type: "hot_lead",
    title: "Hot Lead Escalation",
    message: "A hot lead was assigned to the Bangalore team.",
    severity: "critical",
    metadata: { campaign: "Nikoo Launch" }
  });

  console.log("Admin seed complete.");
}

seedAdmin()
  .catch((error) => {
    console.error("Admin seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
