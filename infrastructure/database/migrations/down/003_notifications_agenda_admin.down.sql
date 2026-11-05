-- Annule 003_notifications_agenda_admin.sql
-- Les fichiers de UPLOAD_DIR ne sont pas supprimés par ce script.

DROP INDEX IF EXISTS idx_orders_pending_created;
ALTER TABLE orders DROP COLUMN IF EXISTS stripe_refund_id;

DROP TABLE IF EXISTS uploads;
DROP TABLE IF EXISTS newsletters;
DROP TABLE IF EXISTS producer_events;

ALTER TABLE users DROP COLUMN IF EXISTS newsletter_opt_in;
ALTER TABLE users DROP COLUMN IF EXISTS push_token;

DROP TABLE IF EXISTS notifications;
DROP TYPE IF EXISTS notification_type;

DELETE FROM migration_log WHERE filename = '003_notifications_agenda_admin.sql';
