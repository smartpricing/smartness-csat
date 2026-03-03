CREATE TABLE IF NOT EXISTS csat.user_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    product_feature_id UUID NOT NULL REFERENCES csat.product_feature(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 10),
    comment TEXT,
    source TEXT NOT NULL CHECK (source IN ('prompted', 'voluntary')),
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_feedback_user_email_product_feature_id
    ON csat.user_feedback (user_email, product_feature_id);

CREATE INDEX IF NOT EXISTS idx_user_feedback_analytics
    ON csat.user_feedback (product_feature_id, created_at)
    INCLUDE (rating);
