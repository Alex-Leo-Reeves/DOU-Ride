// ============================================================
// DOU Transit - Supabase Edge Function: send-notification
// Invoked by database webhooks to send push notifications
// via Firebase Cloud Messaging (FCM) / Web Push.
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

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const FCM_SERVER_KEY = Deno.env.get("FCM_SERVER_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

serve(async (req) => {
  try {
    // Parse the incoming webhook payload
    const payload: WebhookPayload = await req.json();
    const { type, table, record } = payload;

    console.log(`[WEBHOOK] ${type} on ${table} — record ID: ${record?.id}`);

    // Route to the correct notification handler based on table + operation
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

// ============================================================
// HANDLER: Queue called → notify student
// ============================================================
async function handleQueueUpdate(record: Record<string, unknown>) {
  const status = record.status as string;
  if (status !== "called") return;

  const studentId = record.student_id as string;
  const ticketNumber = record.ticket_number as number;
  const destinationId = record.destination_id as string;

  // Get destination name
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

// ============================================================
// HANDLER: Trip update → notify on completion / boarding
// ============================================================
async function handleTripUpdate(record: Record<string, unknown>) {
  const status = record.status as string;
  const tripId = record.id as string;

  if (status === "completed") {
    // Notify all passengers that ride is complete
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
    // Notify driver that students have boarded
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

// ============================================================
// HANDLER: New wallet transaction → notify user
// ============================================================
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
      return; // No notification for other types
  }

  await sendPush({
    userId,
    title,
    body,
    data: { type: notifType, transactionId: record.id as string },
  });
}

// ============================================================
// HANDLER: New emergency → notify admin + driver
// ============================================================
async function handleEmergencyInsert(record: Record<string, unknown>) {
  const studentId = record.student_id as string;
  const incidentId = record.id as string;
  const studentLat = record.student_lat as number;
  const studentLng = record.student_lng as number;

  // Get student name
  const { data: student } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", studentId)
    .single();

  const studentName = student?.full_name ?? "A student";

  // Notify all admins
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

  // Notify assigned driver if present
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

// ============================================================
// HANDLER: New lost item → notify driver of that trip
// ============================================================
async function handleLostItemInsert(record: Record<string, unknown>) {
  const tripId = record.trip_id as string;
  const description = record.description as string;
  const category = record.category as string;

  if (!tripId) return;

  // Get driver for this trip
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
    data: {
      type: "lost_item_reported",
      tripId,
      category,
    },
  });
}

// ============================================================
// HANDLER: Delivery order update → notify relevant parties
// ============================================================
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
// CORE: Send push notification via FCM
// ============================================================
async function sendPush(payload: NotificationPayload): Promise<boolean> {
  const { userId, title, body, data } = payload;

  try {
    // Get user's active FCM/webpush token
    const { data: tokenData } = await supabase
      .from("notification_tokens")
      .select("token, platform")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!tokenData) {
      console.log(`[FCM] No token for user ${userId}`);
      return false;
    }

    const { token, platform } = tokenData;

    // Save notification to history
    await supabase.from("notification_history").insert({
      user_id: userId,
      title,
      body,
      data: data ?? null,
      is_read: false,
    });

    // Send via Firebase HTTP v1 API
    const message: Record<string, unknown> = {
      to: token,
      notification: { title, body },
      data: { ...data, title, body },
      priority: "high",
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
        priority: "high",
        notification: {
          channel_id: "dou_transit_default",
          priority: "high",
          default_sound: true,
          default_vibrate_timings: true,
        },
      };
    }

    const response = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `key=${FCM_SERVER_KEY}`,
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log(`[FCM] Sent to ${userId}:`, result);

    return result.success ?? result.message_id != null;
  } catch (error) {
    console.error(`[FCM] Error sending to ${userId}:`, error.message);
    return false;
  }
}
