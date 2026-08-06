import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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
    const debugDoc = await db.collection("system").doc("pubscale-debug").get();
    
    if (!debugDoc.exists) {
      return {
        statusCode: 200,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({
          "Callback status": "idle",
          "Last callback received": null,
          "Last processed user ID": null,
          "Last reward amount": null,
          "Last error message": null
        }, null, 2)
      };
    }

    const data = debugDoc.data() || {};
    return {
      statusCode: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        "Callback status": data.status || "idle",
        "Last callback received": data.lastCallbackReceived || null,
        "Last processed user ID": data.lastUserId || null,
        "Last reward amount": data.lastRewardAmount !== undefined ? data.lastRewardAmount : null,
        "Last error message": data.lastErrorMessage || null
      }, null, 2)
    };
  } catch (err: any) {
    console.error("[Netlify PubScale Debug Error]:", err);
    return {
      statusCode: 500,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        error: "Internal server error",
        message: err.message
      }, null, 2)
    };
  }
};
