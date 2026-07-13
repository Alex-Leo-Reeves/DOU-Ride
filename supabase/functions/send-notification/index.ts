// ============================================================
// DOU Transit - Supabase Edge Function: send-notification
// Invoked by database webhooks to send push notifications
// via Firebase Cloud Messaging (FCM) HTTP v1 API.
// Uses OAuth 2.0 with service account credentials — no legacy server key.
// ============================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: Record<string, unknown>;
  old_record?: Record<string, unknown>;
}

interface NotificationPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  platform?: string;
}

interface ServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const FIREBASE_SERVICE_ACCOUNT_JSON = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON") ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ─── FCM v1 Auth ───────────────────────────────────────────────
// Cache the access token so we don't generate one per message
let _cachedToken: { value: string; expiresAt: number } | null = null;

function parseServiceAccount(): ServiceAccount {
  try {
    return JSON.parse(FIREBASE_SERVICE_ACCOUNT_JSON);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is missing or invalid");
  }
}

/**
 * Generate a Google OAuth 2.0 access token for FCM from the
 * service account JSON using a JWT bearer grant (client_assertion).
 *
 * Instead of requiring a JWT library, this manually constructs the
 * RS256-signed assertion using the Web Crypto API — it's just
 * Base64url-encoded header.payload + RSASSA-PKCS1-v1_5 signature.
 */
async function getFcmAccessToken(): Promise<string> {
  if (_cachedToken && Date.now() < _cachedToken.expiresAt) {
    return _cachedToken.value;
  }

  const sa = parseServiceAccount();

  // ── Step 1: Build the JWT assertion ──
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: sa.token_uri, // https://oauth2.googleapis.com/token
    iat: now,
    exp: now + 3600,
  };

  const encodeB64 = (obj: unknown) =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  const headerB64 = encodeB64(header);
  const payloadB64 = encodeB64(payload);
  const assertionInput = `${headerB64}.${payloadB64}`;

  // ── Step 2: Sign with the private key using SubtleCrypto ──
  const privateKeyPem = sa.private_key;
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = privateKeyPem
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\s/g, "");

  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    privateKey,
    new TextEncoder().encode(assertionInput),
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwtAssertion = `${assertionInput}.${signatureB64}`;

  // ── Step 3: Exchange the assertion for an access token ──
  const tokenResponse = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwtAssertion,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`OAuth token exchange failed: ${tokenResponse.status} — ${errorText}`);
  }

  const tokenData = await tokenResponse.json();

  _cachedToken = {
    value: tokenData.access_token,
    expiresAt: now + tokenData.expires_in - 60, // 60s buffer
  };

  console.log("[FCM] New OAuth access token obtained (expires in " + tokenData.expires_in + "s)");
  return _cachedToken.value;
}

// ─── FCM v1 Send ────────────────────────────────────────────────

const FCM_V1_ENDPOINT = "https://fcm.googleapis.com/v1/projects/dou-ride/messages:send";

/**
 * Build the FCM v1 API message body for a given platform.
 *
 * v1 format: { message: { token, notification, android/webpush, data } }
 * Note: v1 `data` values must be strings.
 */
function buildV1Message(
  token: string,
  title: string,
  body: string,
  data: Record<string, string>,
  platform: string,
): Record<string, unknown> {
  const message: Record<string, unknown> = {
    token,
    notification: { title, body },
    data: { ...data },
  };

  if (platform === "ios_pwa") {
    message.webpush = {
      notification: {
        title,
        body,
        icon: "/icons/Icon-192.png",
        badge: "/icons/Icon-192.png",
        requireInteraction: true,
        tag: "dou-transit",
      },
    };
  } else {
    message.android = {
      priority: "HIGH",
      notification: {
        channel_id: "dou_transit_default",
        priority: "HIGH",
        default_sound: true,
        default_vibrate_timings: true,
      },
    };
  }

  return { message };
}

/**
 * Send a push notification via FCM HTTP v1 API (OAuth 2.0).
 * Returns true if FCM accepted the message.
 */
async function sendPush(payload: NotificationPayload): Promise<boolean> {
  const { userId, title, body, data = {} } = payload;

  try {
    // Get user's active FCM / web push token
    const { data: tokenData, error: tokenError } = await supabase
      .from("notification_tokens")
      .select("token, platform")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (tokenError || !tokenData) {
      console.log(`[FCM] No active token for user ${userId} — ${tokenError?.message ?? "none"}`);
      return false;
    }

    const { token, platform } = tokenData;

    // Save to notification history
    await supabase.from("notification_history").insert({
      user_id: userId,
      title,
      body,
      data: Object.keys(data).length > 0 ? data : null,
      is_read: false,
    });

    // Get OAuth access token from service account
    const accessToken = await getFcmAccessToken();

    // Build v1 API message
    const v1Body = buildV1Message(token, title, body, data, platform);

    // Send via FCM HTTP v1
    const response = await fetch(FCM_V1_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(v1Body),
    });

    const result = await response.json();

    if (response.ok) {
      console.log(`[FCM] Sent to ${userId} (${platform}): name=${result.name}`);
      return true;
    }

    console.error(`[FCM] Error sending to ${userId}: ${response.status} — ${JSON.stringify(result)}`);
    return false;
  } catch (error) {
    console.error(`[FCM] Error sending to ${userId}:`, error.message);
    return false;
  }
}

// ============================================================
// HANDLERS (unchanged — routing logic stays the same)
// ============================================================

async function handleQueueUpdate(record: Record<string, unknown>) {
  const status = record.status as string;
  if (status !== "called") return;

  const studentId = record.student_id as string;
  const ticketNumber = record.ticket_number as number;
  const destinationId = record.destination_id as string;

  const { data: landmark } = await supabase
    .from("campus_landmarks")
    .select("display_name")
    .eq("id", destinationId)
    .single();

  const destinationName = landmark?.display_name ?? "Destination";

  await sendPush({
    userId: studentId,
    title: "🎫 Queue Called!",
    body: `Ticket #${ticketNumber} — Your Keke to ${destinationName} is ready! You have 120 seconds to board.`,
    data: {
      type: "queue_called",
      ticketNumber: String(ticketNumber),
      destinationName,
    },
  });
}

async function handleTripUpdate(record: Record<string, unknown>) {
  const status = record.status as string;
  const tripId = record.id as string;

  if (status === "completed") {
    const { data: passengers } = await supabase
      .from("trip_passengers")
      .select("student_id")
      .eq("trip_id", tripId);

    if (!passengers) return;

    for (const p of passengers) {
      await sendPush({
        userId: p.student_id,
        title: "🏁 Ride Complete",
        body: "Your ride has ended. Please make sure you've paid via the driver's pay link.",
        data: { type: "ride_completed", tripId },
      });
    }
  }

  if (status === "boarding") {
    const driverId = record.driver_id as string;
    if (driverId) {
      await sendPush({
        userId: driverId,
        title: "✅ Students Boarding",
        body: "Students are boarding. Get ready to depart!",
        data: { type: "boarding_started", tripId },
      });
    }
  }
}

async function handleTransactionInsert(record: Record<string, unknown>) {
  const userId = record.user_id as string;
  const txType = record.type as string;
  const amount = Number(record.amount);
  const status = record.status as string;

  if (status !== "completed" && status !== "pending") return;

  const absAmount = Math.abs(amount);
  let title: string;
  let body: string;
  let notifType: string;

  switch (txType) {
    case "deposit":
      notifType = "wallet_deposit";
      title = "💰 Wallet Funded";
      body = `₦${absAmount} added to your wallet.`;
      break;
    case "withdrawal":
      notifType = "wallet_withdrawal";
      title = "🏦 Withdrawal Processed";
      body = `₦${absAmount} withdrawn. Pending bank processing.`;
      break;
    case "transfer_in":
      notifType = "transfer_received";
      title = "📥 Transfer Received";
      body = `₦${absAmount} received from another user.`;
      break;
    case "ride_payout":
      notifType = "ride_payout";
      title = "💰 Ride Payout";
      body = `₦${absAmount} earned from a ride.`;
      break;
    case "penalty":
      notifType = "penalty_applied";
      title = "⚠️ Penalty Applied";
      body = `₦${absAmount} deducted as penalty.`;
      break;
    default:
      return;
  }

  await sendPush({
    userId,
    title,
    body,
    data: { type: notifType, transactionId: record.id as string },
  });
}

async function handleEmergencyInsert(record: Record<string, unknown>) {
  const studentId = record.student_id as string;
  const incidentId = record.id as string;
  const studentLat = record.student_lat as number;
  const studentLng = record.student_lng as number;

  const { data: student } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", studentId)
    .single();

  const studentName = student?.full_name ?? "A student";

  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .eq("is_suspended", false);

  if (admins) {
    for (const admin of admins) {
      await sendPush({
        userId: admin.id,
        title: "🚨 MEDICAL EMERGENCY",
        body: `${studentName} needs immediate medical attention at (${studentLat}, ${studentLng}).`,
        data: {
          type: "emergency_alert",
          incidentId,
          studentLat: String(studentLat),
          studentLng: String(studentLng),
        },
      });
    }
  }

  const driverId = record.driver_id as string;
  if (driverId) {
    await sendPush({
      userId: driverId,
      title: "🚨 MEDICAL EMERGENCY",
      body: `A student needs immediate medical attention. Proceed to their location.`,
      data: {
        type: "emergency_alert",
        incidentId,
        studentLat: String(studentLat),
        studentLng: String(studentLng),
      },
    });
  }
}

async function handleLostItemInsert(record: Record<string, unknown>) {
  const tripId = record.trip_id as string;
  const description = record.description as string;
  const category = record.category as string;

  if (!tripId) return;

  const { data: trip } = await supabase
    .from("trips")
    .select("driver_id")
    .eq("id", tripId)
    .single();

  if (!trip?.driver_id) return;

  await sendPush({
    userId: trip.driver_id,
    title: "🔍 Lost Item Reported",
    body: `A student reported a lost item on your ride: ${description} (${category}). Please check your Keke.`,
    data: { type: "lost_item_reported", tripId, category },
  });
}

async function handleDeliveryOrderUpdate(record: Record<string, unknown>) {
  const status = record.status as string;
  const studentId = record.student_id as string;
  const vendorId = record.vendor_id as string;
  const orderId = record.id as string;

  switch (status) {
    case "ready_for_pickup": {
      const { data: vendor } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", vendorId)
        .single();

      if (vendor) {
        await sendPush({
          userId: studentId,
          title: "📋 Order Ready",
          body: `${vendor.full_name} has marked your order ready for pickup.`,
          data: { type: "order_ready", orderId },
        });
      }
      break;
    }

    case "in_transit": {
      const driverId = record.driver_id as string;
      if (driverId) {
        const { data: driver } = await supabase
          .from("driver_details")
          .select("fleet_number")
          .eq("user_id", driverId)
          .single();

        const { data: driverProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", driverId)
          .single();

        if (driver && driverProfile) {
          await sendPush({
            userId: studentId,
            title: "🛵 Out for Delivery",
            body: `${driverProfile.full_name} (Fleet #${driver.fleet_number}) is delivering your order.`,
            data: { type: "order_delivery", orderId },
          });
        }
      }
      break;
    }

    case "delivered": {
      await sendPush({
        userId: studentId,
        title: "✅ Order Delivered",
        body: "Your order has been delivered. Enjoy!",
        data: { type: "order_delivered", orderId },
      });
      break;
    }
  }
}

// ============================================================
// SERVER ENTRY POINT
// ============================================================

serve(async (req) => {
  try {
    const payload: WebhookPayload = await req.json();
    const { type, table, record } = payload;

    console.log(`[WEBHOOK] ${type} on ${table} — record ID: ${record?.id}`);

    switch (`${table}:${type}`) {
      case "virtual_queue:UPDATE":
        await handleQueueUpdate(record);
        break;
      case "trips:UPDATE":
        await handleTripUpdate(record);
        break;
      case "wallet_transactions:INSERT":
        await handleTransactionInsert(record);
        break;
      case "emergency_incidents:INSERT":
        await handleEmergencyInsert(record);
        break;
      case "lost_items:INSERT":
        await handleLostItemInsert(record);
        break;
      case "delivery_orders:UPDATE":
        await handleDeliveryOrderUpdate(record);
        break;
      default:
        console.log(`[WEBHOOK] No handler for ${table}:${type}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[WEBHOOK] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
