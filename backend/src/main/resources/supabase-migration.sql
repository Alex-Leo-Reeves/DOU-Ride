-- ============================================================
-- DOU Transit - Complete Supabase Database Migration
-- Run this entire script in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PROFILES (base user for all roles)
-- ============================================================
CREATE TABLE profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT UNIQUE,
    phone           TEXT UNIQUE,
    full_name       TEXT NOT NULL,
    role            TEXT NOT NULL CHECK (role IN ('student','driver','security','admin','vendor','developer')),
    avatar_url      TEXT,
    is_suspended    BOOLEAN NOT NULL DEFAULT false,
    suspension_reason TEXT,
    fcm_token       TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. STUDENT DETAILS
-- ============================================================
CREATE TABLE student_details (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    matric_number   TEXT UNIQUE NOT NULL,
    department      TEXT NOT NULL,
    faculty         TEXT NOT NULL,
    level           TEXT,
    is_verified     BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. DRIVER DETAILS
-- ============================================================
CREATE TABLE driver_details (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    keke_registration   TEXT UNIQUE NOT NULL,
    fleet_number        INTEGER UNIQUE NOT NULL,
    face_photo_url      TEXT,
    verification_qr_code TEXT UNIQUE,
    max_seats           INTEGER NOT NULL DEFAULT 3,
    current_seats       INTEGER NOT NULL DEFAULT 0,
    driver_status       TEXT NOT NULL DEFAULT 'offline' CHECK (driver_status IN ('offline','idle','en_route','with_passengers','emergency')),
    bank_account_name   TEXT,
    bank_account_number TEXT,
    bank_name           TEXT,
    bank_code           TEXT,
    bank_change_pending BOOLEAN NOT NULL DEFAULT false,
    pending_bank_name   TEXT,
    pending_account_number TEXT,
    pending_bank_code   TEXT,
    is_verified         BOOLEAN NOT NULL DEFAULT false,
    is_suspended        BOOLEAN NOT NULL DEFAULT false,
    total_trips         INTEGER NOT NULL DEFAULT 0,
    total_earned        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. CAMPUS LANDMARKS (pickup zones, destinations, etc.)
-- ============================================================
CREATE TABLE campus_landmarks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name    TEXT NOT NULL,
    latitude        DECIMAL(10,7) NOT NULL,
    longitude       DECIMAL(10,7) NOT NULL,
    landmark_type   TEXT NOT NULL CHECK (landmark_type IN ('destination','pickup_zone','vendor','medical_center','park','gate')),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_by      UUID REFERENCES profiles(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. TRIPS
-- ============================================================
CREATE TABLE trips (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id       UUID NOT NULL REFERENCES profiles(id),
    trip_type       TEXT NOT NULL DEFAULT 'standard' CHECK (trip_type IN ('standard','drop','emergency','delivery')),
    status          TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','accepted','boarding','in_progress','completed','cancelled','no_show')),
    pickup_lat      DECIMAL(10,7),
    pickup_lng      DECIMAL(10,7),
    destination_id  UUID REFERENCES campus_landmarks(id),
    destination_name TEXT,
    destination_lat DECIMAL(10,7),
    destination_lng DECIMAL(10,7),
    total_fare      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    driver_share    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    platform_fee    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    seats_occupied  INTEGER NOT NULL DEFAULT 0,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 6. TRIP PASSENGERS (students on a trip)
-- ============================================================
CREATE TABLE trip_passengers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id         UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES profiles(id),
    boarding_pin    TEXT NOT NULL,
    boarding_status TEXT NOT NULL DEFAULT 'pending' CHECK (boarding_status IN ('pending','confirmed','no_show')),
    payment_status  TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid','refunded')),
    fare_paid       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    boarded_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(trip_id, student_id)
);

-- ============================================================
-- 7. VIRTUAL QUEUE
-- ============================================================
CREATE TABLE virtual_queue (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID NOT NULL REFERENCES profiles(id),
    destination_id  UUID NOT NULL REFERENCES campus_landmarks(id),
    ticket_number   INTEGER NOT NULL,
    seats_requested INTEGER NOT NULL DEFAULT 1,
    status          TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','called','boarding','completed','cancelled','no_show')),
    called_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 8. WALLET TRANSACTIONS
-- ============================================================
CREATE TABLE wallet_transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES profiles(id),
    type            TEXT NOT NULL CHECK (type IN ('deposit','withdrawal','ride_payment','ride_payout','refund','penalty','platform_fee','transfer_in','transfer_out')),
    amount          DECIMAL(12,2) NOT NULL,
    fee             DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    balance_before  DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    balance_after   DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
    reference       TEXT UNIQUE,
    description     TEXT,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 9. DRIVER PAY LINKS (QR-based payments)
-- ============================================================
CREATE TABLE driver_pay_links (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id       UUID NOT NULL REFERENCES profiles(id),
    trip_id         UUID REFERENCES trips(id),
    qr_code_data    TEXT NOT NULL,
    amount          DECIMAL(10,2) NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    scanned_by      UUID REFERENCES profiles(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 10. LOST ITEMS
-- ============================================================
CREATE TABLE lost_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id         UUID REFERENCES trips(id),
    student_id      UUID NOT NULL REFERENCES profiles(id),
    driver_id       UUID REFERENCES profiles(id),
    description     TEXT NOT NULL,
    category        TEXT NOT NULL DEFAULT 'Other',
    status          TEXT NOT NULL DEFAULT 'reported' CHECK (status IN ('reported','acknowledged','dropped_off','collected','closed')),
    created_by      TEXT NOT NULL DEFAULT 'student' CHECK (created_by IN ('student','admin')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 11. REPORTS (incident reports by security/admin)
-- ============================================================
CREATE TABLE reports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id     UUID NOT NULL REFERENCES profiles(id),
    target_id       UUID NOT NULL REFERENCES profiles(id),
    target_role     TEXT NOT NULL CHECK (target_role IN ('student','driver','security','admin','vendor')),
    incident_type   TEXT NOT NULL CHECK (incident_type IN ('overloading','reckless_driving','damaged_vehicle','unruly_behavior','no_ticket','refused_pin','verbal_abuse','gate_disturbance','queue_jumping','other')),
    description     TEXT,
    status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','dismissed')),
    resolved_by     UUID REFERENCES profiles(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 12. EMERGENCY INCIDENTS
-- ============================================================
CREATE TABLE emergency_incidents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID NOT NULL REFERENCES profiles(id),
    driver_id       UUID REFERENCES profiles(id),
    student_lat     DECIMAL(10,7),
    student_lng     DECIMAL(10,7),
    student_phone   TEXT,
    driver_lat      DECIMAL(10,7),
    driver_lng      DECIMAL(10,7),
    status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','en_route','arrived_medical','resolved','abuse_flagged')),
    abuse_reason    TEXT,
    resolved_by     UUID REFERENCES profiles(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 13. VENDOR PRODUCTS (marketplace)
-- ============================================================
CREATE TABLE vendor_products (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id       UUID NOT NULL REFERENCES profiles(id),
    name            TEXT NOT NULL,
    description     TEXT,
    price           DECIMAL(10,2) NOT NULL,
    image_url       TEXT,
    is_available    BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 14. DELIVERY ORDERS (marketplace)
-- ============================================================
CREATE TABLE delivery_orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID NOT NULL REFERENCES profiles(id),
    vendor_id       UUID NOT NULL REFERENCES profiles(id),
    driver_id       UUID REFERENCES profiles(id),
    items           JSONB NOT NULL DEFAULT '[]',
    total_amount    DECIMAL(10,2) NOT NULL,
    delivery_fee    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','preparing','ready_for_pickup','in_transit','delivered','cancelled')),
    package_pin     TEXT,
    dropoff_lat     DECIMAL(10,7),
    dropoff_lng     DECIMAL(10,7),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 15. DRIVER LOCATIONS (real-time streaming)
-- ============================================================
CREATE TABLE driver_locations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id       UUID UNIQUE NOT NULL REFERENCES profiles(id),
    latitude        DECIMAL(10,7) NOT NULL,
    longitude       DECIMAL(10,7) NOT NULL,
    heading         DECIMAL(5,2),
    speed           DECIMAL(5,2),
    last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 16. OFFLINE TRANSACTION QUEUE
-- ============================================================
CREATE TABLE offline_transaction_queue (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES profiles(id),
    payload         JSONB NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at    TIMESTAMPTZ
);

-- ============================================================
-- 17. NOTIFICATION TOKENS
-- ============================================================
CREATE TABLE notification_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    token           TEXT NOT NULL,
    platform        TEXT NOT NULL DEFAULT 'android' CHECK (platform IN ('android','ios_pwa')),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, token)
);

-- ============================================================
-- 18. NOTIFICATION HISTORY
-- ============================================================
CREATE TABLE notification_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    body            TEXT NOT NULL,
    data            JSONB,
    is_read         BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

-- Profiles
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_phone ON profiles(phone);
CREATE INDEX idx_profiles_is_suspended ON profiles(is_suspended);

-- Student details
CREATE INDEX idx_student_details_user ON student_details(user_id);
CREATE INDEX idx_student_details_matric ON student_details(matric_number);
CREATE INDEX idx_student_details_faculty ON student_details(faculty);

-- Driver details
CREATE INDEX idx_driver_details_user ON driver_details(user_id);
CREATE INDEX idx_driver_details_status ON driver_details(driver_status);
CREATE INDEX idx_driver_details_suspended ON driver_details(is_suspended);
CREATE INDEX idx_driver_details_fleet ON driver_details(fleet_number);

-- Campus landmarks
CREATE INDEX idx_landmarks_type ON campus_landmarks(landmark_type);
CREATE INDEX idx_landmarks_active ON campus_landmarks(is_active);

-- Trips
CREATE INDEX idx_trips_driver ON trips(driver_id);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_created ON trips(created_at DESC);
CREATE INDEX idx_trips_driver_status ON trips(driver_id, status);

-- Trip passengers
CREATE INDEX idx_trip_passengers_trip ON trip_passengers(trip_id);
CREATE INDEX idx_trip_passengers_student ON trip_passengers(student_id);
CREATE INDEX idx_trip_passengers_pin ON trip_passengers(boarding_pin);

-- Virtual queue
CREATE INDEX idx_queue_destination_status ON virtual_queue(destination_id, status);
CREATE INDEX idx_queue_student ON virtual_queue(student_id);
CREATE INDEX idx_queue_ticket ON virtual_queue(destination_id, ticket_number);

-- Wallet transactions
CREATE INDEX idx_wallet_user ON wallet_transactions(user_id);
CREATE INDEX idx_wallet_type ON wallet_transactions(type);
CREATE INDEX idx_wallet_created ON wallet_transactions(created_at DESC);
CREATE INDEX idx_wallet_reference ON wallet_transactions(reference);
CREATE INDEX idx_wallet_user_created ON wallet_transactions(user_id, created_at DESC);

-- Lost items
CREATE INDEX idx_lost_student ON lost_items(student_id);
CREATE INDEX idx_lost_driver ON lost_items(driver_id);
CREATE INDEX idx_lost_status ON lost_items(status);

-- Reports
CREATE INDEX idx_reports_reporter ON reports(reporter_id);
CREATE INDEX idx_reports_target ON reports(target_id);
CREATE INDEX idx_reports_status ON reports(status);

-- Emergency incidents
CREATE INDEX idx_emergency_status ON emergency_incidents(status);
CREATE INDEX idx_emergency_student ON emergency_incidents(student_id);

-- Marketplace
CREATE INDEX idx_products_vendor ON vendor_products(vendor_id);
CREATE INDEX idx_products_available ON vendor_products(is_available);
CREATE INDEX idx_orders_student ON delivery_orders(student_id);
CREATE INDEX idx_orders_vendor ON delivery_orders(vendor_id);
CREATE INDEX idx_orders_driver ON delivery_orders(driver_id);
CREATE INDEX idx_orders_status ON delivery_orders(status);

-- Driver locations (for real-time queries)
CREATE INDEX idx_driver_locations_seen ON driver_locations(last_seen_at DESC);

-- Notifications
CREATE INDEX idx_notif_tokens_user ON notification_tokens(user_id);
CREATE INDEX idx_notif_history_user ON notification_history(user_id);
CREATE INDEX idx_notif_history_unread ON notification_history(user_id, is_read);

-- Offline queue
CREATE INDEX idx_offline_queue_status ON offline_transaction_queue(status);
CREATE INDEX idx_offline_queue_user ON offline_transaction_queue(user_id);

-- ============================================================
-- TRIGGER: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_student_details_updated_at BEFORE UPDATE ON student_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_driver_details_updated_at BEFORE UPDATE ON driver_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_campus_landmarks_updated_at BEFORE UPDATE ON campus_landmarks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_trips_updated_at BEFORE UPDATE ON trips
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_virtual_queue_updated_at BEFORE UPDATE ON virtual_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_wallet_transactions_updated_at BEFORE UPDATE ON wallet_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_driver_pay_links_updated_at BEFORE UPDATE ON driver_pay_links
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_lost_items_updated_at BEFORE UPDATE ON lost_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_reports_updated_at BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_emergency_incidents_updated_at BEFORE UPDATE ON emergency_incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_vendor_products_updated_at BEFORE UPDATE ON vendor_products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_delivery_orders_updated_at BEFORE UPDATE ON delivery_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_notification_tokens_updated_at BEFORE UPDATE ON notification_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE campus_landmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE virtual_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_pay_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE lost_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_transaction_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES: Profiles
-- ============================================================

-- Everyone can read their own profile
CREATE POLICY "Users can read own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- Everyone can update their own profile
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Admin can read all profiles
CREATE POLICY "Admin can read all profiles"
    ON profiles FOR SELECT
    USING (auth.jwt() ->> 'role' = 'admin');

-- Admin can update any profile (for suspensions)
CREATE POLICY "Admin can update any profile"
    ON profiles FOR UPDATE
    USING (auth.jwt() ->> 'role' = 'admin');

-- Security can read profiles for scanning
CREATE POLICY "Security can read profiles"
    ON profiles FOR SELECT
    USING (auth.jwt() ->> 'role' IN ('security', 'admin'));

-- ============================================================
-- RLS POLICIES: Student Details
-- ============================================================

CREATE POLICY "Student can read own details"
    ON student_details FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Student can update own details"
    ON student_details FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Admin can read all student details"
    ON student_details FOR SELECT
    USING (auth.jwt() ->> 'role' = 'admin');

-- ============================================================
-- RLS POLICIES: Driver Details
-- ============================================================

CREATE POLICY "Driver can read own details"
    ON driver_details FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Driver can update own details"
    ON driver_details FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Admin can read all driver details"
    ON driver_details FOR SELECT
    USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin can update driver details"
    ON driver_details FOR UPDATE
    USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Security can read driver details"
    ON driver_details FOR SELECT
    USING (auth.jwt() ->> 'role' IN ('security', 'admin'));

-- ============================================================
-- RLS POLICIES: Campus Landmarks
-- ============================================================

CREATE POLICY "Anyone can read active landmarks"
    ON campus_landmarks FOR SELECT
    USING (is_active = true);

CREATE POLICY "Developer can manage landmarks"
    ON campus_landmarks FOR ALL
    USING (auth.jwt() ->> 'role' = 'developer');

-- ============================================================
-- RLS POLICIES: Trips
-- ============================================================

CREATE POLICY "Driver can read own trips"
    ON trips FOR SELECT
    USING (auth.uid() = driver_id);

CREATE POLICY "Driver can update own trips"
    ON trips FOR UPDATE
    USING (auth.uid() = driver_id);

CREATE POLICY "Admin can read all trips"
    ON trips FOR SELECT
    USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Students can read their own trip passengers"
    ON trips FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM trip_passengers tp
        WHERE tp.trip_id = trips.id AND tp.student_id = auth.uid()
    ));

-- ============================================================
-- RLS POLICIES: Trip Passengers
-- ============================================================

CREATE POLICY "Student can read own boarding"
    ON trip_passengers FOR SELECT
    USING (auth.uid() = student_id);

CREATE POLICY "Driver can read passengers for own trips"
    ON trip_passengers FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM trips t WHERE t.id = trip_passengers.trip_id AND t.driver_id = auth.uid()
    ));

-- ============================================================
-- RLS POLICIES: Virtual Queue
-- ============================================================

CREATE POLICY "Student can read own queue entries"
    ON virtual_queue FOR SELECT
    USING (auth.uid() = student_id);

CREATE POLICY "Driver can read queue for destinations"
    ON virtual_queue FOR SELECT
    USING (auth.jwt() ->> 'role' IN ('driver', 'admin'));

CREATE POLICY "Driver can update queue (call next)"
    ON virtual_queue FOR UPDATE
    USING (auth.jwt() ->> 'role' = 'driver');

-- ============================================================
-- RLS POLICIES: Wallet Transactions
-- ============================================================

CREATE POLICY "User can read own transactions"
    ON wallet_transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admin can read all transactions"
    ON wallet_transactions FOR SELECT
    USING (auth.jwt() ->> 'role' = 'admin');

-- ============================================================
-- RLS POLICIES: Lost Items
-- ============================================================

CREATE POLICY "Student can read own lost items"
    ON lost_items FOR SELECT
    USING (auth.uid() = student_id);

CREATE POLICY "Driver can read assigned lost items"
    ON lost_items FOR SELECT
    USING (auth.uid() = driver_id);

CREATE POLICY "Admin can read all lost items"
    ON lost_items FOR SELECT
    USING (auth.jwt() ->> 'role' = 'admin');

-- ============================================================
-- RLS POLICIES: Reports
-- ============================================================

CREATE POLICY "Security can create reports"
    ON reports FOR INSERT
    WITH CHECK (auth.jwt() ->> 'role' IN ('security', 'admin'));

CREATE POLICY "Admin can read all reports"
    ON reports FOR SELECT
    USING (auth.jwt() ->> 'role' = 'admin');

-- ============================================================
-- RLS POLICIES: Emergency Incidents
-- ============================================================

CREATE POLICY "Student can read own emergencies"
    ON emergency_incidents FOR SELECT
    USING (auth.uid() = student_id);

CREATE POLICY "Driver can read emergencies (for assigned driver)"
    ON emergency_incidents FOR SELECT
    USING (auth.uid() = driver_id);

CREATE POLICY "Admin can read all emergencies"
    ON emergency_incidents FOR SELECT
    USING (auth.jwt() ->> 'role' = 'admin');

-- ============================================================
-- RLS POLICIES: Marketplace
-- ============================================================

CREATE POLICY "Anyone can read available products"
    ON vendor_products FOR SELECT
    USING (is_available = true);

CREATE POLICY "Vendor can manage own products"
    ON vendor_products FOR ALL
    USING (auth.uid() = vendor_id);

CREATE POLICY "Student can read own orders"
    ON delivery_orders FOR SELECT
    USING (auth.uid() = student_id);

CREATE POLICY "Vendor can read own orders"
    ON delivery_orders FOR SELECT
    USING (auth.uid() = vendor_id);

CREATE POLICY "Driver can read assigned orders"
    ON delivery_orders FOR SELECT
    USING (auth.uid() = driver_id);

-- ============================================================
-- RLS POLICIES: Driver Locations
-- ============================================================

CREATE POLICY "Anyone can read driver locations"
    ON driver_locations FOR SELECT
    USING (true);

CREATE POLICY "Driver can update own location"
    ON driver_locations FOR ALL
    USING (auth.uid() = driver_id);

-- ============================================================
-- RLS POLICIES: Notifications
-- ============================================================

CREATE POLICY "User can manage own tokens"
    ON notification_tokens FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "User can read own notification history"
    ON notification_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "User can mark own notifications as read"
    ON notification_history FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================================
-- ENABLE REALTIME FOR KEY TABLES
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE driver_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE trips;
ALTER PUBLICATION supabase_realtime ADD TABLE emergency_incidents;
ALTER PUBLICATION supabase_realtime ADD TABLE virtual_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE delivery_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE notification_history;

-- ============================================================
-- SEED DATA: Admin and Security accounts
-- ============================================================

-- Note: Auth users must be created via Supabase Auth API first,
-- then profiles inserted with matching IDs.
-- These are placeholder inserts that reference auth.users.

-- Admin account (created after auth user exists)
-- INSERT INTO profiles (id, email, full_name, role)
-- VALUES ('ADMIN_USER_ID', 'admin@dou.edu.ng', 'Student Affairs Admin', 'admin');

-- Security accounts
-- INSERT INTO profiles (id, email, full_name, role)
-- VALUES
--   ('SECURITY_1_ID', 'security1@dou.edu.ng', 'Main Gate Security', 'security'),
--   ('SECURITY_2_ID', 'security2@dou.edu.ng', 'Faculty Gate Security', 'security');

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
