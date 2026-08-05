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

    const user_id = params.user_id;
    const value = params.value;
    const token = params.token;
    const signature = params.signature;

    console.log(`[Netlify PubScale Postback] Received user_id=${user_id}, value=${value}, token=${token}, signature=${signature}`);

    // 1. Validate inputs
    if (!user_id || !value || !token) {
      console.warn("[Netlify PubScale Postback] Missing required fields: user_id, value, or token");
      return {
        statusCode: 400,
        body: "Missing required parameters"
      };
    }

    const coinsAwarded = Math.trunc(parseFloat(value));
    if (isNaN(coinsAwarded) || coinsAwarded <= 0) {
      console.warn(`[Netlify PubScale Postback] Invalid value parameter: ${value}`);
      return {
        statusCode: 400,
        body: "Invalid reward value"
      };
    }

    // 2. Validate signature if enabled
    const pubscaleSecretKey = process.env.PUBSCALE_SECRET_KEY || "YOUR_PUBSCALE_SECRET_KEY";
    const isSecureHashEnabled = process.env.PUBSCALE_SECURITY_HASH_ENABLED === "true";
    const isPlaceholder = !pubscaleSecretKey || pubscaleSecretKey === "YOUR_PUBSCALE_SECRET_KEY" || pubscaleSecretKey.startsWith("YOUR_");

    const shouldVerify = isSecureHashEnabled && !isPlaceholder;

    if (shouldVerify) {
      if (!signature) {
        console.warn("[Netlify PubScale Postback] Missing signature for verification");
        return {
          statusCode: 400,
          body: "Missing signature"
        };
      }
      // Formula: md5(secret_key.user_id.int(value).token)
      const input = `${pubscaleSecretKey}.${user_id}.${coinsAwarded}.${token}`;
      const expectedHash = crypto.createHash("md5").update(input).digest("hex");

      if (signature.toLowerCase() !== expectedHash.toLowerCase()) {
        console.warn(`[Netlify PubScale Postback] Invalid signature. Received: ${signature.toLowerCase()}, Expected: ${expectedHash.toLowerCase()}`);
        return {
          statusCode: 403,
          body: "Invalid signature hash"
        };
      }
    } else {
      console.log(`[Netlify PubScale Postback] Signature verification skipped (enabled=${isSecureHashEnabled}, isPlaceholder=${isPlaceholder})`);
    }

    // 3. Process reward/transaction atomically in Firestore using transactions
    const userRef = db.collection("users").doc(user_id);
    const offerRef = db.collection("offerHistory").doc("pubscale-" + token);

    await db.runTransaction(async (transaction) => {
      const userSnap = await transaction.get(userRef);
      const offerSnap = await transaction.get(offerRef);

      const userExists = userSnap.exists;
      const offerExists = offerSnap.exists;

      if (offerExists) {
        console.log(`[Netlify PubScale Postback] Transaction ${token} has already been processed. Skipping duplicate reward.`);
        return;
      }

      const offerData = {
        uid: user_id,
        offerId: "pubscale-survey",
        transactionId: token,
        amountLocal: value,
        amountUSD: (parseFloat(value) / 8300).toFixed(6), // 8300 coins = $1 USD
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
          email: "pubscale-user-" + user_id + "@rewardrush.com",
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
      console.log(`[Netlify PubScale Postback] Successfully credited user ${user_id} with ${coinsAwarded} coins.`);
    });

    return {
      statusCode: 200,
      body: "OK"
    };
  } catch (err: any) {
    console.error("[Netlify PubScale Postback Error]:", err);
    return {
      statusCode: 500,
      body: "Internal server error"
    };
  }
};
