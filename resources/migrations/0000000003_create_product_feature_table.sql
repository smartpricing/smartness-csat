CREATE TABLE IF NOT EXISTS csat.product_feature (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_key TEXT NOT NULL REFERENCES csat.product(key),
    key TEXT NOT NULL,
    name TEXT,
    description TEXT,
    interaction_threshold INTEGER NOT NULL,
    rejection_threshold INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_feature_product_key
    ON csat.product_feature (product_key);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_feature_product_key_key
    ON csat.product_feature (product_key, key);
