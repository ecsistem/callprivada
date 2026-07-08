CREATE TABLE plans (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                  VARCHAR(100) NOT NULL,
    price_cents           INTEGER NOT NULL,
    interval              VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
    abacatepay_product_id VARCHAR(255),
    active                BOOLEAN NOT NULL DEFAULT TRUE,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO plans (name, price_cents, interval, active)
VALUES ('Mensal', 2990, 'MONTHLY', TRUE);
