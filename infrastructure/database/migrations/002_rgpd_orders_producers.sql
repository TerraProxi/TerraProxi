-- 002 — Droit à l'oubli (RGPD-4), retrait/livraison des commandes, horaires producteurs
--
-- Suppression d'un compte :
--   * messages envoyés/reçus      → supprimés (CASCADE)
--   * commandes du consommateur   → conservées pour la comptabilité, mais anonymisées (consumer_id NULL)
--   * commandes d'un producteur   → conservées, producer_id NULL
--   * lignes de commande          → conservent le nom du produit (product_name) si le produit disparaît
-- Réversible : voir migrations/down/002_rgpd_orders_producers.down.sql

-- Messages : supprimés avec l'un ou l'autre des interlocuteurs
ALTER TABLE messages DROP CONSTRAINT messages_sender_id_fkey;
ALTER TABLE messages ADD CONSTRAINT messages_sender_id_fkey
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE messages DROP CONSTRAINT messages_receiver_id_fkey;
ALTER TABLE messages ADD CONSTRAINT messages_receiver_id_fkey
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE;

-- Commandes : anonymisées plutôt que supprimées (obligation de conservation comptable)
ALTER TABLE orders ALTER COLUMN consumer_id DROP NOT NULL;
ALTER TABLE orders DROP CONSTRAINT orders_consumer_id_fkey;
ALTER TABLE orders ADD CONSTRAINT orders_consumer_id_fkey
  FOREIGN KEY (consumer_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE orders ALTER COLUMN producer_id DROP NOT NULL;
ALTER TABLE orders DROP CONSTRAINT orders_producer_id_fkey;
ALTER TABLE orders ADD CONSTRAINT orders_producer_id_fkey
  FOREIGN KEY (producer_id) REFERENCES producers(id) ON DELETE SET NULL;

-- Lignes de commande : instantané du nom pour survivre à la suppression du produit
ALTER TABLE order_items ADD COLUMN product_name VARCHAR(255);
UPDATE order_items oi SET product_name = p.name FROM products p WHERE p.id = oi.product_id;
UPDATE order_items SET product_name = 'Produit supprimé' WHERE product_name IS NULL;
ALTER TABLE order_items ALTER COLUMN product_name SET NOT NULL;

ALTER TABLE order_items ALTER COLUMN product_id DROP NOT NULL;
ALTER TABLE order_items DROP CONSTRAINT order_items_product_id_fkey;
ALTER TABLE order_items ADD CONSTRAINT order_items_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

-- Mode de remise de la commande (envoyé par l'application mobile)
ALTER TABLE orders ADD COLUMN delivery_mode VARCHAR(20) NOT NULL DEFAULT 'pickup'
  CHECK (delivery_mode IN ('pickup', 'delivery'));
ALTER TABLE orders ADD COLUMN delivery_address TEXT;

-- Fiche producteur : horaires d'ouverture (PROD-5)
ALTER TABLE producers ADD COLUMN opening_hours TEXT;

-- Rotation des refresh tokens (AUTH-3 / AUTH-4)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens (expires_at);
