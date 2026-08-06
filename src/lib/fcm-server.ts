import { getMessaging } from "firebase-admin/messaging";
import { getFirestore } from "firebase-admin/firestore";

export async function logNotificationDelivery(
  userId: string,
  title: string,
  body: string,
  status: 'success' | 'failed',
  error?: string
) {
  try {
    const db = getFirestore();
    await db.collection("notification_logs").add({
      userId,
      title,
      body,
      status,
      error: error || null,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("[FCM Logger] Failed to write notification log to Firestore:", err);
  }
}

export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  try {
    const db = getFirestore();
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      console.warn(`[FCM Server] User ${userId} not found in Firestore.`);
      await logNotificationDelivery(userId, title, body, 'failed', 'User not found in Firestore.');
      return false;
    }

    const userData = userDoc.data();
    const fcmToken = userData?.fcmToken;
    if (!fcmToken) {
      console.warn(`[FCM Server] User ${userId} has no registered FCM token.`);
      await logNotificationDelivery(userId, title, body, 'failed', 'No FCM token registered.');
      return false;
    }

    const message = {
      token: fcmToken,
      notification: { title, body },
      data: data || {}
    };

    const response = await getMessaging().send(message);
    console.log(`[FCM Server] Successfully sent notification to user ${userId}:`, response);
    await logNotificationDelivery(userId, title, body, 'success');
    return true;
  } catch (err: any) {
    console.error(`[FCM Server] Error sending notification to user ${userId}:`, err);
    await logNotificationDelivery(userId, title, body, 'failed', err?.message || String(err));
    return false;
  }
}

export async function sendBroadcastNotification(
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ successCount: number; failureCount: number }> {
  let successCount = 0;
  let failureCount = 0;
  try {
    const db = getFirestore();
    const usersSnap = await db.collection("users").get();
    
    const tokens: { userId: string; token: string }[] = [];
    usersSnap.forEach(doc => {
      const d = doc.data();
      if (d.fcmToken) {
        tokens.push({ userId: doc.id, token: d.fcmToken });
      }
    });

    if (tokens.length === 0) {
      console.log("[FCM Server] No users with registered FCM tokens found.");
      return { successCount: 0, failureCount: 0 };
    }

    console.log(`[FCM Server] Dispatched broadcast to ${tokens.length} users...`);

    for (const item of tokens) {
      const ok = await sendPushNotification(item.userId, title, body, data);
      if (ok) successCount++;
      else failureCount++;
    }
  } catch (err) {
    console.error("[FCM Server] Error in sendBroadcastNotification:", err);
  }
  return { successCount, failureCount };
}

export async function sendScheduledNotifications(): Promise<{ sentCount: number }> {
  const db = getFirestore();
  
  // Get current time in Indian Standard Time (IST)
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  
  const hour = istTime.getUTCHours();
  const minute = istTime.getUTCMinutes();
  const dateString = istTime.toISOString().split('T')[0]; // YYYY-MM-DD
  
  let eventId: 'morning' | 'afternoon' | 'evening' | 'night' | null = null;
  let title = "";
  let body = "";

  // 7:00 AM (07:00) window (active from 7:00 to 12:00)
  if (hour >= 7 && hour < 12) {
    eventId = 'morning';
    title = "🌞 Good Morning!";
    body = "New offers are waiting. Start earning today!";
  }
  // 1:00 PM (13:00) window (active from 13:00 to 18:00)
  else if (hour >= 13 && hour < 18) {
    eventId = 'afternoon';
    title = "💰 Take a break!";
    body = "Complete a few offers to earn more coins.";
  }
  // 7:00 PM (19:00) window (active from 19:00 to 21:30)
  else if (hour >= 19 && (hour < 21 || (hour === 21 && minute < 30))) {
    eventId = 'evening';
    title = "🔥 Don't miss today's offers!";
    body = "Complete tasks before the day ends!";
  }
  // 9:30 PM (21:30) window (active from 21:30 to 23:59)
  else if ((hour === 21 && minute >= 30) || hour >= 22) {
    eventId = 'night';
    title = "🌙 Good Night!";
    body = "Come back tomorrow for more rewards and earning opportunities.";
  }

  if (!eventId) {
    console.log(`[Scheduler] No active scheduled notification window at ${hour}:${minute} IST.`);
    return { sentCount: 0 };
  }

  console.log(`[Scheduler] Active scheduled event window identified: "${eventId}" on date ${dateString}`);

  // Fetch all users with registered tokens
  const usersSnap = await db.collection("users").get();
  let sentCount = 0;

  for (const doc of usersSnap.docs) {
    const userId = doc.id;
    const userData = doc.data();
    if (!userData.fcmToken) continue;

    const trackingId = `${userId}_${eventId}_${dateString}`;
    const trackingRef = db.collection("sent_scheduled_notifications").doc(trackingId);
    const trackingDoc = await trackingRef.get();

    if (trackingDoc.exists) {
      // Already sent today
      continue;
    }

    // Send the notification!
    const ok = await sendPushNotification(userId, title, body, { eventId, date: dateString });
    if (ok) {
      // Mark as sent in tracking collection
      await trackingRef.set({
        userId,
        eventId,
        date: dateString,
        sentAt: new Date().toISOString()
      });
      sentCount++;
    }
  }

  console.log(`[Scheduler] Scheduled notifications run complete. Sent ${sentCount} notifications.`);
  return { sentCount };
}
