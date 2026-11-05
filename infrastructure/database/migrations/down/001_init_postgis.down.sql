-- Annule 001_init_postgis.sql : supprime tout le schéma applicatif.
-- DESTRUCTIF : toutes les données sont perdues. Faire une sauvegarde avant (docs/maintenance.md).
-- Jouer d'abord les scripts down des migrations suivantes, dans l'ordre inverse.

DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS producers;
DROP TABLE IF EXISTS users;

DROP FUNCTION IF EXISTS update_updated_at();

DROP TYPE IF EXISTS product_category;
DROP TYPE IF EXISTS order_status;
DROP TYPE IF EXISTS user_role;

-- Les extensions postgis et uuid-ossp sont conservées (partagées avec d'autres bases éventuelles).
DELETE FROM migration_log WHERE filename = '001_init_postgis.sql';
