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

-- Add transfer_id column to wallet_transactions if not exists (for transfer tracking)
DO $$ BEGIN
    ALTER TABLE wallet_transactions ADD COLUMN transfer_id TEXT;
EXCEPTION WHEN duplicate_column THEN END $$;

-- Create index for faster reference lookups
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference ON wallet_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status_type ON wallet_transactions(status, type);