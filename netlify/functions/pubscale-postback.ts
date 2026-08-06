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

export const handler = async (event: any, context: any) => {
  const payloadForLog: any = {};
  let user_id: string | null = null;
  let value: string | null = null;
  let token: string | null = null;
  let signature: string | null = null;
  let coinsAwarded: number | null = null;

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
        for (const [k, v] of searchParams.entries()) {
          urlParams[k] = v;
        }
        bodyParams = urlParams;
      }
    }

    const params = {
      ...event.queryStringParameters,
      ...bodyParams
    };

    user_id = params.user_id || null;
    value = params.value || null;
    token = params.token || null;
    signature = params.signature || null;

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
      return {
        statusCode: 400,
        body: errMsg
      };
    }

    coinsAwarded = Math.trunc(parseFloat(value));
    if (isNaN(coinsAwarded) || coinsAwarded <= 0) {
      const errMsg = `Invalid value parameter: ${value}`;
      console.warn(`[PubScale Postback] ${errMsg}`);
      await updateDebugInfo("error", payloadForLog, user_id, null, errMsg);
      return {
        statusCode: 400,
        body: errMsg
      };
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
        return {
          statusCode: 400,
          body: errMsg
        };
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
        return {
          statusCode: 403,
          body: "Invalid signature hash"
        };
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
        // We log the reason instead of failing silently.
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
      return {
        statusCode: 200,
        body: "Duplicate transaction ignored"
      };
    }

    // Log: Coins credited
    console.log(`[PubScale Postback] Coins credited: Successfully credited user ${user_id} with ${coinsAwarded} coins.`);
    await updateDebugInfo("success", payloadForLog, user_id, coinsAwarded, null);

    return {
      statusCode: 200,
      body: "OK"
    };

  } catch (err: any) {
    // Log: Any errors
    console.error("[PubScale Postback Error]:", err);
    
    // Check if it's the "User not found" error we threw
    const isUserNotFoundError = err.message && err.message.includes("User not found");
    const statusType = isUserNotFoundError ? "user_not_found" : "error";
    
    await updateDebugInfo(statusType, payloadForLog, user_id, coinsAwarded, err.message || String(err));
    
    return {
      statusCode: isUserNotFoundError ? 404 : 500,
      body: err.message || "Internal server error"
    };
  }
};
