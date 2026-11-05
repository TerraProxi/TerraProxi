-- 003 — Notifications (EPIC 7), agenda producteur (PROD-6), newsletter (AI-4),
--       photos envoyées (CAT-1), remboursements Stripe
-- Réversible : voir migrations/down/003_notifications_agenda_admin.down.sql

-- ── Notifications in-app (+ push mobile Expo) ────────────────────────────────
CREATE TYPE notification_type AS ENUM (
  'NEW_ORDER',      -- producteur : commande payée à préparer (NOTIF-1)
  'ORDER_STATUS',   -- consommateur : commande en préparation, prête, annulée, expirée (NOTIF-2)
  'PAYMENT',        -- consommateur : paiement confirmé ou refusé
  'NEW_MESSAGE',    -- les deux : nouveau message (NOTIF-3)
  'NEWSLETTER',     -- consommateur : newsletter d'un producteur (AI-4)
  'ACCOUNT'         -- producteur : exploitation vérifiée par un administrateur
);

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        notification_type NOT NULL,
  title       VARCHAR(200) NOT NULL,
  body        VARCHAR(2000) NOT NULL,
  -- Cible ouverte au clic : ORDER (id de commande), CONVERSATION (id de l'interlocuteur),
  -- PRODUCER (id de producteur)
  target_type VARCHAR(20) CHECK (target_type IN ('ORDER', 'CONVERSATION', 'PRODUCER')),
  target_id   UUID,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_created ON notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread  ON notifications (user_id) WHERE NOT is_read;

-- Jeton Expo Push de l'appareil mobile (NOTIF-4) et consentement newsletter (opt-in RGPD)
ALTER TABLE users ADD COLUMN push_token VARCHAR(255);
ALTER TABLE users ADD COLUMN newsletter_opt_in BOOLEAN NOT NULL DEFAULT FALSE;

-- ── Agenda producteur : marchés, portes ouvertes, ventes à la ferme (PROD-6) ──
CREATE TABLE producer_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  producer_id UUID NOT NULL REFERENCES producers(id) ON DELETE CASCADE,
  title       VARCHAR(200) NOT NULL,
  description TEXT,
  location    VARCHAR(500),
  starts_at   TIMESTAMPTZ NOT NULL,
  ends_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE INDEX idx_producer_events_producer ON producer_events (producer_id, starts_at);
CREATE INDEX idx_producer_events_starts   ON producer_events (starts_at);

CREATE TRIGGER trg_producer_events_updated_at
  BEFORE UPDATE ON producer_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Newsletters envoyées par les producteurs (AI-4) ──────────────────────────
CREATE TABLE newsletters (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  producer_id     UUID NOT NULL REFERENCES producers(id) ON DELETE CASCADE,
  subject         VARCHAR(200) NOT NULL,
  body            TEXT NOT NULL,
  recipient_count INTEGER NOT NULL DEFAULT 0 CHECK (recipient_count >= 0),
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_newsletters_producer ON newsletters (producer_id, sent_at DESC);

-- ── Photos envoyées (CAT-1, avatars, bannières) ──────────────────────────────
-- Le fichier est sur disque (UPLOAD_DIR) ; la ligne permet de le supprimer avec le compte.
CREATE TABLE uploads (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename     VARCHAR(100) NOT NULL UNIQUE,
  content_type VARCHAR(50) NOT NULL,
  size_bytes   INTEGER NOT NULL CHECK (size_bytes > 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_uploads_user ON uploads (user_id);

-- ── Commandes : remboursement Stripe et expiration des commandes non payées ──
ALTER TABLE orders ADD COLUMN stripe_refund_id VARCHAR(255);
CREATE INDEX idx_orders_pending_created ON orders (created_at) WHERE status = 'PENDING';
