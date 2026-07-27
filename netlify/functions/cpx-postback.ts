import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";

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
const db = getFirestore();

export const handler = async (event: any, context: any) => {
  try {
    // Parse parameters from query parameters or body
    let bodyParams = {};
    if (event.body) {
      try {
        if (event.isBase64Encoded) {
          const decodedBody = Buffer.from(event.body, 'base64').toString('utf8');
          bodyParams = JSON.parse(decodedBody);
        } else {
          bodyParams = JSON.parse(event.body);
        }
      } catch (e) {
        // Fallback for URL encoded body parameters if any
        const searchParams = new URLSearchParams(event.body);
        const urlParams: any = {};
        for (const [key, value] of searchParams.entries()) {
          urlParams[key] = value;
        }
        bodyParams = urlParams;
      }
    }

    const params = {
      ...event.queryStringParameters,
      ...bodyParams
    };

    const status = params.status;
    const trans_id = params.trans_id;
    const user_id = params.user_id;
    const subid_1 = params.subid_1;
    const subid_2 = params.subid_2;
    const amount_local = params.amount_local;
    const amount_usd = params.amount_usd;
    const offer_id = params.offer_id;
    const hash = params.hash;
    const ip_click = params.ip_click;

    console.log(`[Netlify CPX Postback] Received trans_id=${trans_id}, user_id=${user_id}, status=${status}, amount_local=${amount_local}, hash=${hash}`);

    // 1. Validate inputs
    if (!trans_id || !user_id || !hash) {
      console.warn("[Netlify CPX Postback] Missing required fields: trans_id, user_id, or hash");
      return {
        statusCode: 400,
        body: "Missing required parameters"
      };
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
      console.warn(`[Netlify CPX Postback] Invalid signature. Received: ${receivedHashLower}, Expected Pattern 1: ${expectedHash1.toLowerCase()} or Pattern 2: ${expectedHash2.toLowerCase()}`);
      return {
        statusCode: 403,
        body: "Invalid signature hash"
      };
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
          console.log(`[Netlify CPX Postback] Transaction ${trans_id} is already processed. Skipping duplicate.`);
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
        console.log(`[Netlify CPX Postback] Successfully credited user ${user_id} with ${coinsAwarded} coins.`);

      } else if (status === "2") {
        // REVERSE REWARD
        if (existingOffer && existingOffer.status === "reversed") {
          console.log(`[Netlify CPX Postback] Transaction ${trans_id} already reversed. Skipping.`);
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
        console.log(`[Netlify CPX Postback] Successfully reversed ${coinsToSubtract} coins for user ${user_id}.`);
      }
    });

    return {
      statusCode: 200,
      body: "OK"
    };
  } catch (err: any) {
    console.error("[Netlify CPX Postback Error]:", err);
    return {
      statusCode: 500,
      body: "Internal server error"
    };
  }
};
