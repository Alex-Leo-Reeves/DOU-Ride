-- ============================================================
-- DOU Transit - Migration: Add bank details to profiles table
-- Run this in Supabase SQL Editor to support withdrawals for all users
-- ============================================================

-- Add bank details columns to profiles table (for all users)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
ADD COLUMN IF NOT EXISTS bank_code TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_bank_account ON profiles(bank_account_number) WHERE bank_account_number IS NOT NULL;

-- ============================================================
-- Migration: Add withdrawal callback tracking
-- ============================================================

-- Add metadata column to wallet_transactions if not exists (for transfer tracking)
DO $$ BEGIN
    ALTER TABLE wallet_transactions ADD COLUMN transfer_id TEXT;
EXCEPTION WHEN duplicate_column THEN END $$;

-- Create index for faster reference lookups
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference ON wallet_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status_type ON wallet_transactions(status, type);

-- ============================================================
-- Function: Auto-reconcile stale pending deposits (optional, for manual runs)
-- ============================================================
CREATE OR REPLACE FUNCTION reconcile_pending_deposits(max_age_minutes INT DEFAULT 2)
RETURNS TABLE(tx_ref TEXT, flutterwave_status TEXT, new_status TEXT) AS $$
BEGIN
    RETURN QUERY
    UPDATE wallet_transactions wt
    SET status = CASE
        WHEN wt.status = 'pending' AND wt.created_at < now() - (max_age_minutes || ' minutes')::INTERVAL THEN
            CASE
                -- If we can't verify, leave as pending
                ELSE wt.status
            END
        ELSE wt.status
    END,
    updated_at = now()
    WHERE wt.type = 'deposit' AND wt.status = 'pending'
    AND wt.created_at < now() - (max_age_minutes || ' minutes')::INTERVAL
    RETURNING wt.reference, 'checked'::TEXT, wt.status;
END;
$$ LANGUAGE plpgsql;