import express from "express";
import path from "path";
import crypto from "crypto";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { createServer as createViteServer } from "vite";
import { sendPushNotification, sendScheduledNotifications } from "./src/lib/fcm-server";

// Initialize Firebase Admin securely for backend operations
if (getApps().length === 0) {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountKey) {
    try {
      const credentials = JSON.parse(serviceAccountKey);
      initializeApp({
        credential: cert(credentials),
        projectId: credentials.project_id || "mr-earning-a806d"
      });
      console.log("[Firebase Admin] Initialized successfully with FIREBASE_SERVICE_ACCOUNT credentials.");
    } catch (parseErr) {
      console.error("[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT env var. Falling back.", parseErr);
      initializeApp({
        projectId: "mr-earning-a806d"
      });
    }
  } else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    try {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID || "mr-earning-a806d",
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        })
      });
      console.log("[Firebase Admin] Initialized successfully with private key environment variables.");
    } catch (err) {
      console.error("[Firebase Admin] Failed to initialize with private key environment variables. Falling back.", err);
      initializeApp({
        projectId: "mr-earning-a806d"
      });
    }
  } else {
    initializeApp({
      projectId: "mr-earning-a806d"
    });
    console.log("[Firebase Admin] Initialized with default credentials for project mr-earning-a806d.");
  }
}
const db = getFirestore();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Route to generate CPX Research secure_hash securely
  app.get("/api/cpx-hash", (req, res) => {
    try {
      const uid = req.query.uid as string;
      if (!uid) {
        return res.status(400).json({ error: "Missing uid parameter" });
      }

      // Read secret key from environment variables
      const isSecureHashEnabled = process.env.CPX_SECURITY_HASH_ENABLED === "true";
      const secureHashKey = process.env.CPX_HASH_KEY || process.env.CPX_SECURE_HASH_KEY || "YOUR_HASH_KEY";
      
      const isPlaceholder = !secureHashKey || secureHashKey === "YOUR_HASH_KEY" || secureHashKey === "YOUR_CPX_HASH_KEY" || secureHashKey.startsWith("YOUR_");

      let hash = null;
      const enabled = isSecureHashEnabled && !isPlaceholder;
      
      if (enabled) {
        // Formula: md5(ext_user_id + '-' + secure_hash_key)
        const input = `${uid}-${secureHashKey}`;
        hash = crypto.createHash("md5").update(input).digest("hex");
      }

      const rawAppId = process.env.VITE_CPX_APP_ID || "34945";
      const appId = rawAppId === "34409" ? "34945" : rawAppId;

      console.log(`[CPX Hash Generation] ext_user_id=${uid}, app_id=${appId}, secure_hash_enabled=${enabled}, hash=${hash}`);

      return res.json({
        success: true,
        app_id: appId,
        ext_user_id: uid,
        secure_hash: hash,
        secure_hash_enabled: enabled
      });
    } catch (err: any) {
      console.error("Error in cpx-hash API:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Secure CPX Research Postback Endpoint
  app.all("/api/cpx-postback", async (req, res) => {
    try {
      // Standard CPX parameters can come in query (GET) or body (POST)
      const status = (req.query.status || req.body.status) as string;
      const trans_id = (req.query.trans_id || req.body.trans_id) as string;
      const user_id = (req.query.user_id || req.body.user_id) as string;
      const subid_1 = (req.query.subid_1 || req.body.subid_1) as string;
      const subid_2 = (req.query.subid_2 || req.body.subid_2) as string;
      const amount_local = (req.query.amount_local || req.body.amount_local) as string;
      const amount_usd = (req.query.amount_usd || req.body.amount_usd) as string;
      const offer_id = (req.query.offer_id || req.body.offer_id) as string;
      const hash = (req.query.hash || req.body.hash) as string;
      const ip_click = (req.query.ip_click || req.body.ip_click) as string;

      console.log(`[CPX Postback] Received trans_id=${trans_id}, user_id=${user_id}, status=${status}, amount_local=${amount_local}, hash=${hash}`);

      // 1. Validate inputs
      if (!trans_id || !user_id || !hash) {
        console.warn("[CPX Postback] Missing required fields: trans_id, user_id, or hash");
        return res.status(400).send("Missing required parameters");
      }

      // 2. Validate secure hash
      const secureHashKey = process.env.CPX_HASH_KEY || process.env.CPX_SECURE_HASH_KEY || "YOUR_HASH_KEY";
      
      // Pattern 1: md5(trans_id + '-' + secureHashKey)
      const input1 = `${trans_id}-${secureHashKey}`;
      const expectedHash1 = crypto.createHash("md5").update(input1).digest("hex");

      // Pattern 2: md5(trans_id + '-' + user_id + '-' + amount_local + '-' + secureHashKey)
      const input2 = `${trans_id}-${user_id}-${amount_local}-${secureHashKey}`;
      const expectedHash2 = crypto.createHash("md5").update(input2).digest("hex");

      const receivedHashLower = hash.toLowerCase();
      const isHashValid = (receivedHashLower === expectedHash1.toLowerCase() || receivedHashLower === expectedHash2.toLowerCase());

      if (!isHashValid) {
        console.warn(`[CPX Postback] Invalid signature. Received: ${receivedHashLower}, Expected Pattern 1: ${expectedHash1.toLowerCase()} or Pattern 2: ${expectedHash2.toLowerCase()}`);
        return res.status(403).send("Invalid signature hash");
      }

      // Every completed CPX survey rewards ONLY ₹1 or ₹2 (70% chance = 1, 30% chance = 2)
      const randomValue = Math.random();
      const coinsAwarded = randomValue < 0.7 ? 1 : 2;

      // 3. Process reward/reversal atomically in Firestore using transactions
      const userRef = db.collection("users").doc(user_id);
      const offerRef = db.collection("offerHistory").doc(trans_id);

      await db.runTransaction(async (transaction) => {
        const userSnap = await transaction.get(userRef);
        const offerSnap = await transaction.get(offerRef);

        const userExists = userSnap.exists;
        const offerExists = offerSnap.exists;
        const existingOffer = offerExists ? offerSnap.data() : null;

        if (status === "1") {
          // CREDIT REWARD
          if (existingOffer && existingOffer.status === "completed") {
            console.log(`[CPX Postback] Transaction ${trans_id} is already processed. Skipping duplicate reward.`);
            return;
          }

          const offerData = {
            uid: user_id,
            offerId: offer_id || "cpx-survey",
            transactionId: trans_id,
            amountLocal: amount_local || "0",
            amountUSD: amount_usd || "0",
            coinsAwarded: coinsAwarded,
            status: "completed",
            completedAt: new Date().toISOString()
          };

          const ledgerItem = {
            id: `tx-cpx-${trans_id}`,
            title: "CPX Research Survey Reward",
            amount: coinsAwarded,
            timestamp: new Date().toISOString(),
            type: "earn",
            status: "completed"
          };

          if (userExists) {
            const userData = userSnap.data() || {};
            const currentCoins = userData.coins || 0;
            const currentTotalEarned = userData.totalEarned || 0;
            const currentCompletedOffers = userData.completedOffers || 0;

            transaction.update(userRef, {
              coins: currentCoins + coinsAwarded,
              totalEarned: currentTotalEarned + coinsAwarded,
              completedOffers: currentCompletedOffers + 1,
              lastReward: coinsAwarded,
              history: FieldValue.arrayUnion(ledgerItem)
            });
          } else {
            transaction.set(userRef, {
              uid: user_id,
              fullName: "Survey Explorer",
              email: "cpx-user-" + user_id + "@rewardrush.com",
              profilePhoto: "user-0",
              coins: coinsAwarded,
              totalEarned: coinsAwarded,
              totalWithdrawn: 0,
              pendingWithdraw: 0,
              completedOffers: 1,
              lastReward: coinsAwarded,
              joinedAt: new Date().toISOString(),
              isAdmin: false,
              isBanned: false,
              history: [ledgerItem]
            });
          }

          transaction.set(offerRef, offerData);
          console.log(`[CPX Postback] Successfully credited user ${user_id} with ${coinsAwarded} coins.`);
          
          sendPushNotification(user_id, "Coins Credited! 💸", `You earned +${coinsAwarded} coins from CPX Research!`).catch(err => {
            console.error("[FCM CPX] Failed to send push notification:", err);
          });

        } else if (status === "2") {
          // REVERSE REWARD
          if (existingOffer && existingOffer.status === "reversed") {
            console.log(`[CPX Postback] Transaction ${trans_id} already reversed. Skipping.`);
            return;
          }

          const coinsToSubtract = existingOffer ? existingOffer.coinsAwarded : coinsAwarded;

          const offerData = {
            uid: user_id,
            offerId: offer_id || "cpx-survey",
            transactionId: trans_id,
            amountLocal: amount_local || "0",
            amountUSD: amount_usd || "0",
            coinsAwarded: coinsToSubtract,
            status: "reversed",
            completedAt: new Date().toISOString()
          };

          const ledgerItem = {
            id: `tx-cpx-rev-${trans_id}`,
            title: "CPX Survey Reward Reversed",
            amount: -coinsToSubtract,
            timestamp: new Date().toISOString(),
            type: "redeem",
            status: "completed"
          };

          if (userExists) {
            const userData = userSnap.data() || {};
            const currentCoins = userData.coins || 0;
            const newCoins = Math.max(0, currentCoins - coinsToSubtract);

            transaction.update(userRef, {
              coins: newCoins,
              history: FieldValue.arrayUnion(ledgerItem)
            });
          }

          transaction.set(offerRef, offerData);
          console.log(`[CPX Postback] Successfully reversed ${coinsToSubtract} coins for user ${user_id}.`);
        }
      });

      return res.status(200).send("OK");
    } catch (err: any) {
      console.error("[CPX Postback Error]:", err);
      return res.status(500).send("Internal server error");
    }
  });

  // Helper to update the debug document
  async function updateDebugInfo(status: string, payload: any, userId: string | null, rewardAmount: number | null, errorMessage: string | null) {
    try {
      await db.collection("system").doc("pubscale-debug").set({
        status,
        lastCallbackReceived: payload,
        lastUserId: userId,
        lastRewardAmount: rewardAmount,
        lastErrorMessage: errorMessage,
        updatedAt: new Date().toISOString()
      });
      console.log(`[PubScale Debug Updated] status=${status}, userId=${userId}, rewardAmount=${rewardAmount}`);
    } catch (err) {
      console.error("Failed to update pubscale-debug Firestore doc:", err);
    }
  }

  // Unified Secure PubScale Postback Endpoint (supporting both Express and Netlify path formats)
  app.all(["/api/pubscale-postback", "/.netlify/functions/pubscale-postback"], async (req, res) => {
    const payloadForLog: any = {};
    let user_id: string | null = null;
    let value: string | null = null;
    let token: string | null = null;
    let signature: string | null = null;
    let coinsAwarded: number | null = null;

    try {
      // PubScale parameters can come in query (GET) or body (POST)
      const params = {
        ...req.query,
        ...req.body
      };

      user_id = (params.user_id) as string || null;
      value = (params.value) as string || null;
      token = (params.token) as string || null;
      signature = (params.signature) as string || null;

      // Redact sensitive secrets from logged payload but keep basic fields
      Object.keys(params).forEach(k => {
        if (k.toLowerCase().includes("secret") || k.toLowerCase().includes("key")) {
          payloadForLog[k] = "[REDACTED]";
        } else {
          payloadForLog[k] = params[k];
        }
      });

      // 1. Log: Callback received
      console.log("[PubScale Postback] Callback received. Payload:", JSON.stringify(payloadForLog));

      // 2. Log: User ID, Reward value, token
      console.log(`[PubScale Postback] Extracted parameters: user_id=${user_id}, value=${value}, token=${token}, signature=${signature}`);

      // Validate inputs
      if (!user_id || !value || !token) {
        const errMsg = "Missing required fields: user_id, value, or token";
        console.warn(`[PubScale Postback] ${errMsg}`);
        await updateDebugInfo("error", payloadForLog, user_id, null, errMsg);
        return res.status(400).send(errMsg);
      }

      coinsAwarded = Math.trunc(parseFloat(value));
      if (isNaN(coinsAwarded) || coinsAwarded <= 0) {
        const errMsg = `Invalid value parameter: ${value}`;
        console.warn(`[PubScale Postback] ${errMsg}`);
        await updateDebugInfo("error", payloadForLog, user_id, null, errMsg);
        return res.status(400).send(errMsg);
      }

      // 3. Verify signature if enabled
      const pubscaleSecretKey = process.env.PUBSCALE_SECRET_KEY || "YOUR_PUBSCALE_SECRET_KEY";
      const isSecureHashEnabled = process.env.PUBSCALE_SECURITY_HASH_ENABLED === "true";
      const isPlaceholder = !pubscaleSecretKey || pubscaleSecretKey === "YOUR_PUBSCALE_SECRET_KEY" || pubscaleSecretKey.startsWith("YOUR_");

      const shouldVerify = isSecureHashEnabled && !isPlaceholder;
      let sigResult = "";

      if (shouldVerify) {
        if (!signature) {
          const errMsg = "Missing signature for verification";
          console.warn(`[PubScale Postback] ${errMsg}`);
          await updateDebugInfo("error", payloadForLog, user_id, coinsAwarded, errMsg);
          return res.status(400).send(errMsg);
        }
        // Formula: md5(secret_key.user_id.int(value).token)
        const input = `${pubscaleSecretKey}.${user_id}.${coinsAwarded}.${token}`;
        const expectedHash = crypto.createHash("md5").update(input).digest("hex");

        if (signature.toLowerCase() !== expectedHash.toLowerCase()) {
          const errMsg = `Invalid signature. Received: ${signature.toLowerCase()}, Expected: ${expectedHash.toLowerCase()}`;
          console.warn(`[PubScale Postback] ${errMsg}`);
          sigResult = "failed";
          // 4. Log: Signature verification result
          console.log(`[PubScale Postback] Signature verification result: ${sigResult}`);
          await updateDebugInfo("error", payloadForLog, user_id, coinsAwarded, errMsg);
          return res.status(403).send("Invalid signature hash");
        } else {
          sigResult = "passed";
          console.log(`[PubScale Postback] Signature verification result: ${sigResult}`);
        }
      } else {
        sigResult = "skipped";
        console.log(`[PubScale Postback] Signature verification result: ${sigResult} (isSecureHashEnabled=${isSecureHashEnabled}, isPlaceholder=${isPlaceholder})`);
      }

      // 4. Process reward/transaction atomically in Firestore using transactions
      const userRef = db.collection("users").doc(user_id);
      const offerRef = db.collection("offerHistory").doc("pubscale-" + token);

      let duplicateDetected = false;
      let userFound = false;

      await db.runTransaction(async (transaction) => {
        const userSnap = await transaction.get(userRef);
        const offerSnap = await transaction.get(offerRef);

        userFound = userSnap.exists;
        const offerExists = offerSnap.exists;

        // Log: User found/not found
        if (!userFound) {
          console.warn(`[PubScale Postback] User found/not found: NOT FOUND (UID=${user_id})`);
          throw new Error(`User not found in Firestore. Cannot credit coins.`);
        } else {
          console.log(`[PubScale Postback] User found/not found: FOUND (UID=${user_id})`);
        }

        if (offerExists) {
          duplicateDetected = true;
          // Log: Duplicate transaction detected
          console.log(`[PubScale Postback] Duplicate transaction detected: Token ${token} has already been processed.`);
          return;
        }

        const offerData = {
          uid: user_id,
          offerId: "pubscale-survey",
          transactionId: token,
          amountLocal: value,
          amountUSD: (parseFloat(value!) / 83).toFixed(6), // 83 coins = $1 USD
          coinsAwarded: coinsAwarded,
          status: "completed",
          completedAt: new Date().toISOString()
        };

        const ledgerItem = {
          id: `tx-pubscale-${token}`,
          title: "PubScale Complete Surveys Reward",
          amount: coinsAwarded,
          timestamp: new Date().toISOString(),
          type: "earn",
          status: "completed"
        };

        const userData = userSnap.data() || {};
        const currentCoins = userData.coins || 0;
        const currentTotalEarned = userData.totalEarned || 0;
        const currentCompletedOffers = userData.completedOffers || 0;

        transaction.update(userRef, {
          coins: currentCoins + coinsAwarded,
          totalEarned: currentTotalEarned + coinsAwarded,
          completedOffers: currentCompletedOffers + 1,
          lastReward: coinsAwarded,
          history: FieldValue.arrayUnion(ledgerItem)
        });

        transaction.set(offerRef, offerData);
      });

      if (duplicateDetected) {
        await updateDebugInfo("duplicate", payloadForLog, user_id, coinsAwarded, "Duplicate transaction ignored");
        return res.status(200).send("Duplicate transaction ignored");
      }

      // Log: Coins credited
      console.log(`[PubScale Postback] Coins credited: Successfully credited user ${user_id} with ${coinsAwarded} coins.`);
      await updateDebugInfo("success", payloadForLog, user_id, coinsAwarded, null);

      sendPushNotification(user_id, "Coins Credited! 💸", `You earned +${coinsAwarded} coins from PubScale Surveys!`).catch(err => {
        console.error("[FCM PubScale] Failed to send push notification:", err);
      });

      return res.status(200).send("OK");
    } catch (err: any) {
      // Log: Any errors
      console.error("[PubScale Postback Error]:", err);
      
      const isUserNotFoundError = err.message && err.message.includes("User not found");
      const statusType = isUserNotFoundError ? "user_not_found" : "error";
      
      await updateDebugInfo(statusType, payloadForLog, user_id, coinsAwarded, err.message || String(err));
      
      return res.status(isUserNotFoundError ? 404 : 500).send(err.message || "Internal server error");
    }
  });

  // PubScale Debug Endpoint (supporting both Express and Netlify path formats)
  app.all(["/api/pubscale-debug", "/.netlify/functions/pubscale-debug"], async (req, res) => {
    try {
      const debugDoc = await db.collection("system").doc("pubscale-debug").get();
      
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");

      if (!debugDoc.exists) {
        return res.json({
          "Callback status": "idle",
          "Last callback received": null,
          "Last processed user ID": null,
          "Last reward amount": null,
          "Last error message": null
        });
      }

      const data = debugDoc.data() || {};
      return res.json({
        "Callback status": data.status || "idle",
        "Last callback received": data.lastCallbackReceived || null,
        "Last processed user ID": data.lastUserId || null,
        "Last reward amount": data.lastRewardAmount !== undefined ? data.lastRewardAmount : null,
        "Last error message": data.lastErrorMessage || null
      });
    } catch (err: any) {
      console.error("[PubScale Debug Route Error]:", err);
      return res.status(500).json({
        error: "Internal server error",
        message: err.message
      });
    }
  });

  // 1. Send Notification API Endpoint
  app.post(["/api/send-notification", "/.netlify/functions/send-notification"], async (req, res) => {
    try {
      const { userId, type, amount, title: customTitle, body: customBody } = req.body;

      if (!userId || !type) {
        return res.status(400).json({ error: "Missing required fields: userId and type are required." });
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
          return res.status(400).json({ error: `Unsupported notification type: ${type}` });
      }

      console.log(`[Push API Server] Sending notification of type "${type}" to user ${userId}...`);
      const sent = await sendPushNotification(userId, title, body, { type, amount: String(amount || 0) });

      return res.status(200).json({ status: "success", sent, title, body });
    } catch (err: any) {
      console.error("[Push API Server Error]:", err);
      return res.status(500).json({ error: err.message || String(err) });
    }
  });

  // 2. Scheduled Notifications Trigger API Endpoint
  app.all(["/api/scheduled-notifications", "/.netlify/functions/scheduled-notifications"], async (req, res) => {
    try {
      console.log("[Push API Server] Running scheduled notifications check manually...");
      const result = await sendScheduledNotifications();
      return res.status(200).json({ status: "success", result });
    } catch (err: any) {
      console.error("[Push API Server Scheduler Error]:", err);
      return res.status(500).json({ error: err.message || String(err) });
    }
  });

  // 3. Automated Server-Side Background Scheduler
  // Check scheduled notifications every 10 minutes
  setInterval(async () => {
    try {
      console.log("[Background Scheduler] Checking scheduled notifications...");
      await sendScheduledNotifications();
    } catch (err) {
      console.error("[Background Scheduler Error]:", err);
    }
  }, 10 * 60 * 1000); // 10 minutes

  // Serve static files or setup Vite in dev mode
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
