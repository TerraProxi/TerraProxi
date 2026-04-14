-- Migration 001 : Activation PostGIS et création du schéma complet TerraProxi

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- ── Types énumérés ───────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('CONSUMER', 'PRODUCER', 'ADMIN');

CREATE TYPE order_status AS ENUM (
  'PENDING',
  'PAID',
  'PREPARING',
  'READY',
  'COMPLETED',
  'CANCELLED'
);

CREATE TYPE product_category AS ENUM (
  'FRUITS_VEGETABLES',
  'DAIRY',
  'MEAT',
  'BEVERAGES',
  'FINE_GROCERY',
  'CRAFTS',
  'FLOWERS_PLANTS',
  'OTHER'
);

-- ── Table users ──────────────────────────────────────────────────────────────

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  role          user_role NOT NULL DEFAULT 'CONSUMER',
  phone         VARCHAR(20),
  avatar_url    VARCHAR(500),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  -- RGPD : consentement explicite
  gdpr_consent  BOOLEAN NOT NULL DEFAULT FALSE,
  gdpr_consent_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_role  ON users (role);

-- ── Table producers ──────────────────────────────────────────────────────────

CREATE TABLE producers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name    VARCHAR(255) NOT NULL,
  description     TEXT,
  address         VARCHAR(500),
  city            VARCHAR(100),
  postal_code     VARCHAR(10),
  -- Colonne géospatiale PostGIS (POINT longitude/latitude, SRID 4326 = WGS84)
  location        GEOMETRY(Point, 4326),
  website_url     VARCHAR(500),
  banner_url      VARCHAR(500),
  is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Index spatial GIST pour requêtes de proximité ST_DWithin
CREATE INDEX idx_producers_location ON producers USING GIST (location);
CREATE INDEX idx_producers_user_id  ON producers (user_id);

-- ── Table products ───────────────────────────────────────────────────────────

CREATE TABLE products (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  producer_id  UUID NOT NULL REFERENCES producers(id) ON DELETE CASCADE,
  name         VARCHAR(255) NOT NULL,
  description  TEXT,
  price        DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  stock        INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  unit         VARCHAR(50) DEFAULT 'unité',
  category     product_category NOT NULL DEFAULT 'OTHER',
  image_url    VARCHAR(500),
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_producer  ON products (producer_id);
CREATE INDEX idx_products_category  ON products (category);
CREATE INDEX idx_products_available ON products (is_available);

-- ── Table orders ─────────────────────────────────────────────────────────────

CREATE TABLE orders (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consumer_id          UUID NOT NULL REFERENCES users(id),
  producer_id          UUID NOT NULL REFERENCES producers(id),
  status               order_status NOT NULL DEFAULT 'PENDING',
  total_price          DECIMAL(10, 2) NOT NULL CHECK (total_price >= 0),
  stripe_payment_id    VARCHAR(255),
  stripe_payment_intent VARCHAR(255),
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_consumer   ON orders (consumer_id);
CREATE INDEX idx_orders_producer   ON orders (producer_id);
CREATE INDEX idx_orders_status     ON orders (status);

-- ── Table order_items ────────────────────────────────────────────────────────

CREATE TABLE order_items (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id   UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity   INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0)
);

CREATE INDEX idx_order_items_order   ON order_items (order_id);
CREATE INDEX idx_order_items_product ON order_items (product_id);

-- ── Table messages ───────────────────────────────────────────────────────────

CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id   UUID NOT NULL REFERENCES users(id),
  receiver_id UUID NOT NULL REFERENCES users(id),
  content     TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_sender   ON messages (sender_id);
CREATE INDEX idx_messages_receiver ON messages (receiver_id);
CREATE INDEX idx_messages_sent_at  ON messages (sent_at DESC);

-- ── Table refresh_tokens ─────────────────────────────────────────────────────

CREATE TABLE refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);

-- ── Trigger updated_at automatique ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_producers_updated_at
  BEFORE UPDATE ON producers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
