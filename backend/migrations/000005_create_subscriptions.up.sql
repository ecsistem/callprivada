CREATE TABLE subscriptions (
    id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id                    UUID NOT NULL REFERENCES plans(id),
    abacatepay_subscription_id VARCHAR(255),
    status                     VARCHAR(20) NOT NULL DEFAULT 'pending',
    current_period_end         TIMESTAMPTZ,
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions (user_id);
CREATE INDEX idx_subscriptions_abacatepay_id ON subscriptions (abacatepay_subscription_id) WHERE abacatepay_subscription_id IS NOT NULL;
