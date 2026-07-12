ALTER TABLE billing_transactions
    DROP COLUMN IF EXISTS gateway,
    DROP COLUMN IF EXISTS waymb_txn_id,
    DROP COLUMN IF EXISTS waymb_method,
    DROP COLUMN IF EXISTS multibanco_entity,
    DROP COLUMN IF EXISTS multibanco_reference,
    DROP COLUMN IF EXISTS multibanco_expires_at;
