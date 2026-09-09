BEGIN;

CREATE TABLE IF NOT EXISTS pajoy_shops (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO pajoy_shops (id, name, active) VALUES
  ('shop-1', 'Shop 1', TRUE),
  ('shop-2', 'Shop 2', TRUE)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, active = EXCLUDED.active;

ALTER TABLE pajoy_branches ADD COLUMN IF NOT EXISTS shop_id TEXT;
ALTER TABLE pajoy_products ADD COLUMN IF NOT EXISTS shop_id TEXT;
ALTER TABLE pajoy_products ADD COLUMN IF NOT EXISTS garment_type TEXT;
ALTER TABLE pajoy_products ADD COLUMN IF NOT EXISTS pattern TEXT;
ALTER TABLE pajoy_products ADD COLUMN IF NOT EXISTS check_colors TEXT[];
ALTER TABLE pajoy_products ADD COLUMN IF NOT EXISTS collar_style TEXT;
ALTER TABLE pajoy_products ADD COLUMN IF NOT EXISTS sleeve_style TEXT;
ALTER TABLE pajoy_inventory ADD COLUMN IF NOT EXISTS shop_id TEXT;
ALTER TABLE pajoy_customers ADD COLUMN IF NOT EXISTS shop_id TEXT;
ALTER TABLE pajoy_orders ADD COLUMN IF NOT EXISTS shop_id TEXT;
ALTER TABLE pajoy_payments ADD COLUMN IF NOT EXISTS shop_id TEXT;
ALTER TABLE pajoy_dtf_jobs ADD COLUMN IF NOT EXISTS shop_id TEXT;
ALTER TABLE pajoy_document_sequences ADD COLUMN IF NOT EXISTS shop_id TEXT;
ALTER TABLE pajoy_users ADD COLUMN IF NOT EXISTS shop_id TEXT;
ALTER TABLE pajoy_activity ADD COLUMN IF NOT EXISTS shop_id TEXT;
ALTER TABLE pajoy_customers ADD COLUMN IF NOT EXISTS uniform_product_ids TEXT[];

UPDATE pajoy_branches SET shop_id = CASE WHEN id = 'branch-2' THEN 'shop-2' ELSE 'shop-1' END WHERE shop_id IS NULL;
UPDATE pajoy_products SET shop_id = 'shop-1' WHERE shop_id IS NULL;
UPDATE pajoy_inventory SET shop_id = 'shop-1' WHERE shop_id IS NULL;
UPDATE pajoy_customers SET shop_id = 'shop-1' WHERE shop_id IS NULL;
UPDATE pajoy_orders SET shop_id = 'shop-1' WHERE shop_id IS NULL;
UPDATE pajoy_payments SET shop_id = 'shop-1' WHERE shop_id IS NULL;
UPDATE pajoy_dtf_jobs SET shop_id = 'shop-1' WHERE shop_id IS NULL;
UPDATE pajoy_activity SET shop_id = 'shop-1' WHERE shop_id IS NULL;

COMMIT;
