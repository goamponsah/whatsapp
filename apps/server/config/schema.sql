CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- Enable pgvector if available (optional)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  whatsapp_number TEXT UNIQUE NOT NULL,
  locale TEXT DEFAULT 'en_GH',
  time_zone TEXT DEFAULT 'Africa/Accra',
  paystack_public_key TEXT,
  paystack_secret_key TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS faq_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT,
  -- embedding VECTOR(1536), -- uncomment if using pgvector
  content TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_phone TEXT,
  user_name TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  status TEXT CHECK (status IN ('pending','confirmed','cancelled')) DEFAULT 'pending',
  payment_status TEXT CHECK (payment_status IN ('none','pending','paid','failed')) DEFAULT 'none',
  paystack_ref TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages_audit (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_phone TEXT,
  direction TEXT CHECK (direction IN ('in','out')),
  body TEXT,
  intent TEXT,
  confidence NUMERIC,
  tool_called TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Helpers
CREATE INDEX IF NOT EXISTS idx_faq_tenant ON faq_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON messages_audit(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant ON bookings(tenant_id);


CREATE TABLE IF NOT EXISTS availability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  weekday SMALLINT CHECK (weekday BETWEEN 0 AND 6), -- 0=Sunday
  open_time TIME NOT NULL,
  close_time TIME NOT NULL,
  slot_minutes SMALLINT DEFAULT 60,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, weekday)
);

CREATE TABLE IF NOT EXISTS unavailable_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reason TEXT,
  UNIQUE (tenant_id, date)
);
