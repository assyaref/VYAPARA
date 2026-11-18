ALTER TABLE customers ADD COLUMN loyalty_points INTEGER DEFAULT 0;

INSERT OR IGNORE INTO settings (key, value) VALUES ('loyalty_earn_amount', '10000');
INSERT OR IGNORE INTO settings (key, value) VALUES ('loyalty_redeem_amount', '100');
