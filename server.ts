import express from "express";
import path from "path";
import crypto from "crypto";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { createServer as createViteServer } from "vite";

// Initialize Firebase Admin securely for backend operations
if (getApps().length === 0) {
  initializeApp({
    projectId: "mr-earning-a806d"
  });
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
      const secureHashKey = process.env.CPX_HASH_KEY || process.env.CPX_SECURE_HASH_KEY || "YOUR_HASH_KEY";
      
      // Formula: md5(ext_user_id + '-' + secure_hash_key)
      const input = `${uid}-${secureHashKey}`;
      const hash = crypto.createHash("md5").update(input).digest("hex");

      return res.json({
        success: true,
        app_id: 34409,
        ext_user_id: uid,
        secure_hash: hash,
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

      const amountLocalNum = parseFloat(amount_local) || 0;
      const coinsAwarded = Math.round(amountLocalNum);

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
