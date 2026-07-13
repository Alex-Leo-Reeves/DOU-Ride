-- ============================================================
-- DOU Transit - Database Webhook Triggers
-- Run this in Supabase SQL Editor after the main migration.
-- These triggers invoke the send-notification Edge Function
-- whenever key events occur in the database.
-- ============================================================

-- ============================================================
-- First, create the webhook function that calls the Edge Function
-- ============================================================

-- Create or replace the webhook function
CREATE OR REPLACE FUNCTION public.handle_database_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  webhook_url text := 'https://uawbhgrxmvwrhncpophm.supabase.co/functions/v1/send-notification';
  payload jsonb;
BEGIN
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', CASE
      WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb
      ELSE row_to_json(NEW)::jsonb
    END,
    'old_record', CASE
      WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)::jsonb
      WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb
      ELSE null
    END
  );

  -- Perform the HTTP request asynchronously (fire-and-forget)
  PERFORM
    net.http_post(
      url := webhook_url,
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer <insert-service-role-key>"}'::jsonb,
      body := payload::text
    );

  RETURN NULL; -- Trigger functions should return NULL for AFTER triggers
END;
$$;

-- ============================================================
-- TRIGGER 1: virtual_queue → notify student when queue called
-- Fires on UPDATE when status changes to 'called'
-- ============================================================
CREATE OR REPLACE FUNCTION notify_queue_called()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'called' AND OLD.status = 'waiting' THEN
    PERFORM public.handle_database_webhook();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_queue_called_notification ON virtual_queue;
CREATE TRIGGER trg_queue_called_notification
  AFTER UPDATE ON virtual_queue
  FOR EACH ROW
  WHEN (NEW.status = 'called' AND OLD.status = 'waiting')
  EXECUTE FUNCTION notify_queue_called();

-- ============================================================
-- TRIGGER 2: trips → notify passengers when trip completes
-- Fires on UPDATE when status changes to 'completed'
-- ============================================================
CREATE OR REPLACE FUNCTION notify_trip_completed()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IN ('completed', 'boarding') AND OLD.status != NEW.status THEN
    PERFORM public.handle_database_webhook();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trip_completed_notification ON trips;
CREATE TRIGGER trg_trip_completed_notification
  AFTER UPDATE ON trips
  FOR EACH ROW
  WHEN (NEW.status IN ('completed', 'boarding') AND OLD.status != NEW.status)
  EXECUTE FUNCTION notify_trip_completed();

-- ============================================================
-- TRIGGER 3: wallet_transactions → notify on new deposit/withdrawal
-- Fires on INSERT
-- ============================================================
CREATE OR REPLACE FUNCTION notify_wallet_transaction()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only notify for meaningful transactions (not platform_fee entries)
  IF NEW.type NOT IN ('platform_fee') AND NEW.status IN ('completed', 'pending') THEN
    PERFORM public.handle_database_webhook();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wallet_tx_notification ON wallet_transactions;
CREATE TRIGGER trg_wallet_tx_notification
  AFTER INSERT ON wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_wallet_transaction();

-- ============================================================
-- TRIGGER 4: emergency_incidents → notify admin + driver
-- Fires on INSERT
-- ============================================================
CREATE OR REPLACE FUNCTION notify_emergency()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.handle_database_webhook();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_emergency_notification ON emergency_incidents;
CREATE TRIGGER trg_emergency_notification
  AFTER INSERT ON emergency_incidents
  FOR EACH ROW
  EXECUTE FUNCTION notify_emergency();

-- ============================================================
-- TRIGGER 5: lost_items → notify driver
-- Fires on INSERT
-- ============================================================
CREATE OR REPLACE FUNCTION notify_lost_item()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.handle_database_webhook();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lost_item_notification ON lost_items;
CREATE TRIGGER trg_lost_item_notification
  AFTER INSERT ON lost_items
  FOR EACH ROW
  EXECUTE FUNCTION notify_lost_item();

-- ============================================================
-- TRIGGER 6: delivery_orders → notify student/vendor
-- Fires on UPDATE when status changes
-- ============================================================
CREATE OR REPLACE FUNCTION notify_delivery_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status != OLD.status AND NEW.status IN ('ready_for_pickup', 'in_transit', 'delivered') THEN
    PERFORM public.handle_database_webhook();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_delivery_update_notification ON delivery_orders;
CREATE TRIGGER trg_delivery_update_notification
  AFTER UPDATE ON delivery_orders
  FOR EACH ROW
  WHEN (NEW.status != OLD.status AND NEW.status IN ('ready_for_pickup', 'in_transit', 'delivered'))
  EXECUTE FUNCTION notify_delivery_update();

-- ============================================================
-- CREATE EXTENSION IF NOT EXISTS (for net.http_post)
-- ============================================================
-- The pg_net extension must be enabled in Supabase dashboard:
-- Database → Extensions → Enable "pg_net"
-- Or run: CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";

-- Note: The net extension requires superuser, which Supabase provides
-- for the service_role. If you see an error about net, run:
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================
-- HELPER: Get the service role key for the webhook auth header
-- Replace '<insert-service-role-key>' in the handle_database_webhook
-- function with: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhd2JoZ3J4bXZ3cmhuY3BvcGhtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzg5NTY1NiwiZXhwIjoyMDk5NDcxNjU2fQ.Ehgn9JGlTHoCkCxHml5QzXBpLaW1_ZRZoHjS3liDFsY
-- ============================================================

-- ============================================================
-- DATABASE WEBHOOK (Alternative: Use Supabase Dashboard)
-- Instead of triggers + pg_net, you can configure webhooks in:
-- Supabase Dashboard → Database → Webhooks
-- Create 6 webhooks pointing to:
--   https://uawbhgrxmvwrhncpophm.supabase.co/functions/v1/send-notification
-- Each with the appropriate table, event type, and condition.
-- ============================================================

-- ============================================================
-- CONFIGURATION SUMMARY
-- ============================================================
-- | # | Trigger Name          | Table               | Event     | Condition                         |
-- |---|-----------------------|---------------------|-----------|-----------------------------------|
-- | 1 | queue_called          | virtual_queue       | UPDATE    | status: waiting → called          |
-- | 2 | trip_update           | trips               | UPDATE    | status → completed or boarding    |
-- | 3 | wallet_tx             | wallet_transactions | INSERT    | type NOT platform_fee             |
-- | 4 | emergency             | emergency_incidents | INSERT    | any                               |
-- | 5 | lost_item             | lost_items          | INSERT    | any                               |
-- | 6 | delivery_update       | delivery_orders     | UPDATE    | status → ready/in_transit/delivered|
-- ============================================================
