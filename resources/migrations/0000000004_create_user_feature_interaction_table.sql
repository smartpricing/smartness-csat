CREATE TABLE IF NOT EXISTS csat.user_feature_interaction (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    product_feature_id UUID NOT NULL REFERENCES csat.product_feature(id),
    interaction_count INTEGER NOT NULL DEFAULT 0,
    total_interaction_count INTEGER NOT NULL DEFAULT 0,
    rejection_count INTEGER NOT NULL DEFAULT 0,
    latest_user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_email, product_feature_id)
);

CREATE INDEX IF NOT EXISTS idx_user_feature_interaction_user_email
    ON csat.user_feature_interaction (user_email);
