import { getApps, initializeApp, cert } from "firebase-admin/app";
import { sendPushNotification } from "../../src/lib/fcm-server";

// Initialize Firebase Admin securely
if (getApps().length === 0) {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountKey) {
    try {
      const credentials = JSON.parse(serviceAccountKey);
      initializeApp({
        credential: cert(credentials),
        projectId: credentials.project_id || "mr-earning-a806d"
      });
    } catch (parseErr) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT env var. Falling back.", parseErr);
      initializeApp({
        projectId: "mr-earning-a806d"
      });
    }
  } else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID || "mr-earning-a806d",
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      })
    });
  } else {
    initializeApp({
      projectId: "mr-earning-a806d"
    });
  }
}

export const handler = async (event: any, context: any) => {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed"
    };
  }

  try {
    let bodyParams: any = {};
    if (event.body) {
      try {
        if (event.isBase64Encoded) {
          const decodedBody = Buffer.from(event.body, 'base64').toString('utf8');
          bodyParams = JSON.parse(decodedBody);
        } else {
          bodyParams = JSON.parse(event.body);
        }
      } catch (parseErr) {
        console.error("Failed to parse event body", parseErr);
        return {
          statusCode: 400,
          body: "Invalid JSON body"
        };
      }
    }

    const { userId, type, amount, title: customTitle, body: customBody } = bodyParams;

    if (!userId || !type) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing required fields: userId and type are required." })
      };
    }

    let title = "";
    let body = "";

    switch (type) {
      case "reward_credited":
        title = "Coins Credited! 💸";
        body = `You earned +${amount || 0} coins! Your balance has been updated.`;
        break;
      case "withdrawal_requested":
        title = "Withdrawal Dispatched! 🏦";
        body = `Your request for ₹${amount || 0} has been securely logged and is pending approval.`;
        break;
      case "withdrawal_approved":
        title = "Withdrawal Approved! 💸";
        body = `Congratulations! Your payout of ₹${amount || 0} has been successfully completed!`;
        break;
      case "withdrawal_rejected":
        title = "Withdrawal Rejected! ❌";
        body = "Your withdrawal request has been rejected. Please review your details and try again.";
        break;
      case "daily_login":
        title = "Daily Reward Claimed! 🔥";
        body = `Your daily streak has been maintained! Credited +${amount || 0} coins.`;
        break;
      case "new_offers":
        title = "New Offers Available! ⚡";
        body = "Fresh surveys and high-paying offers are now active. Start earning!";
        break;
      case "test":
        title = customTitle || "Test Push Notification";
        body = customBody || "This is a real-time push notification test from Reward Rush!";
        break;
      default:
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: `Unsupported notification type: ${type}` })
        };
    }

    console.log(`[Push API] Sending notification of type "${type}" to user ${userId}...`);
    const sent = await sendPushNotification(userId, title, body, { type, amount: String(amount || 0) });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "success", sent, title, body })
    };
  } catch (err: any) {
    console.error("[Push API Error]:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message || String(err) })
    };
  }
};
