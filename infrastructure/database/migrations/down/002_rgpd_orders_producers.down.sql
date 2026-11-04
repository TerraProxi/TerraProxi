-- Annule 002_rgpd_orders_producers.sql
-- Attention : échoue si des commandes anonymisées (consumer_id/producer_id NULL) existent.

DROP INDEX IF EXISTS idx_refresh_tokens_expires;
ALTER TABLE producers DROP COLUMN opening_hours;
ALTER TABLE orders DROP COLUMN delivery_address;
ALTER TABLE orders DROP COLUMN delivery_mode;

ALTER TABLE order_items DROP CONSTRAINT order_items_product_id_fkey;
ALTER TABLE order_items ADD CONSTRAINT order_items_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES products(id);
ALTER TABLE order_items ALTER COLUMN product_id SET NOT NULL;
ALTER TABLE order_items DROP COLUMN product_name;

ALTER TABLE orders DROP CONSTRAINT orders_producer_id_fkey;
ALTER TABLE orders ADD CONSTRAINT orders_producer_id_fkey
  FOREIGN KEY (producer_id) REFERENCES producers(id);
ALTER TABLE orders ALTER COLUMN producer_id SET NOT NULL;

ALTER TABLE orders DROP CONSTRAINT orders_consumer_id_fkey;
ALTER TABLE orders ADD CONSTRAINT orders_consumer_id_fkey
  FOREIGN KEY (consumer_id) REFERENCES users(id);
ALTER TABLE orders ALTER COLUMN consumer_id SET NOT NULL;

ALTER TABLE messages DROP CONSTRAINT messages_receiver_id_fkey;
ALTER TABLE messages ADD CONSTRAINT messages_receiver_id_fkey
  FOREIGN KEY (receiver_id) REFERENCES users(id);
ALTER TABLE messages DROP CONSTRAINT messages_sender_id_fkey;
ALTER TABLE messages ADD CONSTRAINT messages_sender_id_fkey
  FOREIGN KEY (sender_id) REFERENCES users(id);
