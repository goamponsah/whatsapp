# Admin (Next.js)

Minimal admin panel to create tenants and upload FAQs.

## Setup
```bash
cd apps/admin
npm install
export NEXT_PUBLIC_SERVER_URL=http://localhost:8080
npm run dev
```
Open http://localhost:3000

## Auth
Set a shared token so the Admin UI can call the server:
```bash
# server .env
SERVER_ADMIN_JWT=change-this-token
# admin shell
export NEXT_PUBLIC_ADMIN_TOKEN=change-this-token
```
