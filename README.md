# WhatsApp AI Customer Support & Booking Agent (Scaffold)

Minimal, production-lean scaffold for a WhatsApp-based AI agent for Ghana/West Africa SMEs.
- Backend: Fastify (TypeScript), Postgres (pg), Redis (ioredis)
- Webhooks: WhatsApp Cloud API, Paystack
- RAG-ready: FAQ storage + embeddings placeholders
- Observability: Pino logs
- Docker: Postgres + Redis
- Postman collection included

## Quick Start

### 0) Requirements
- Node.js 20+
- Docker (for Postgres + Redis) or access to managed instances
- WhatsApp Cloud API app (Meta), phone number, and token
- Paystack account (test mode ok)
- OpenAI API key (for embeddings & LLM) — optional until you wire it

### 1) Clone & Install
```bash
cd apps/server
cp .env.example .env    # fill values
npm install
```

### 2) Run Databases
```bash
cd ../../
docker compose up -d
# This starts Postgres on 5432 and Redis on 6379
```

### 3) Initialize DB
```bash
cd apps/server
npm run db:init
```

### 4) Start Dev Server
```bash
npm run dev
# Server runs on http://localhost:8080
```

### 5) Expose a Public URL (for webhooks)
Use ngrok or cloud hosting. Set your WhatsApp webhook URL to:
```
GET/POST https://<your-public-host>/webhooks/whatsapp
```
Verify token must match `META_VERIFY_TOKEN` in `.env`.

### 6) Test with Postman
Import the Postman collection from `postman/whatsapp-agent.postman_collection.json`.

---

## Project Structure
```
whatsapp-agent-scaffold/
  apps/
    server/
      src/
        app.ts
        orchestrator.ts
        lib/
          db.ts
          redis.ts
          verify.ts
          wa.ts
          nlp.ts
          rag.ts
          pay.ts
        routes/
          admin.ts
      config/
        schema.sql
      package.json
      tsconfig.json
      .env.example
  docker-compose.yml
  postman/
    whatsapp-agent.postman_collection.json
```

## Notes
- This is a scaffold: you must add your LLM calls in `rag.ts` and enhance `nlp.ts` as needed.
- Ensure you configure webhook signatures for both Meta and Paystack.
- Add proper auth for `/admin/*` routes before going to production.

MIT License.


## Admin UI
See `apps/admin/README.md` for running the Next.js admin.

## Quick Seed
Insert a demo tenant, FAQs, and availability:
```bash
cd apps/server
npm run seed
# Output prints the tenant_id to use in Admin
```
Optionally set:
```
SEED_TENANT_NAME="KwikStay Lodge"
SEED_TENANT_WHATSAPP="+233555001122"
```
