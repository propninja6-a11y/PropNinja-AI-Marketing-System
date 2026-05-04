# PropNinja AI Marketing System

Full-stack starter with clean architecture and modular backend services.

## Includes
- Node.js + Express API
- PostgreSQL schema and migration script
- APIs for leads, campaigns, calls, WhatsApp
- Vapi integration for AI calls
- WATI integration for WhatsApp
- Trigger-based automation engine
- Webhook handlers for Vapi and WATI
- BullMQ queue system with Redis

## Run
1. docker compose up -d
2. npm install
3. Copy apps/server/.env.example to apps/server/.env
4. npm run db:migrate
5. npm run dev
