import crypto from "crypto";

export const handler = async (event: any, context: any) => {
  try {
    const uid = event.queryStringParameters?.uid;
    if (!uid) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing uid parameter" })
      };
    }

    const isSecureHashEnabled = process.env.CPX_SECURITY_HASH_ENABLED === "true";
    const secureHashKey = process.env.CPX_HASH_KEY || process.env.CPX_SECURE_HASH_KEY || "YOUR_HASH_KEY";
    
    const isPlaceholder = !secureHashKey || secureHashKey === "YOUR_HASH_KEY" || secureHashKey === "YOUR_CPX_HASH_KEY" || secureHashKey.startsWith("YOUR_");

    let hash = null;
    const enabled = isSecureHashEnabled && !isPlaceholder;
    
    if (enabled) {
      const input = `${uid}-${secureHashKey}`;
      hash = crypto.createHash("md5").update(input).digest("hex");
    }

    const rawAppId = process.env.VITE_CPX_APP_ID || "34945";
    const appId = rawAppId === "34409" ? "34945" : rawAppId;

    console.log(`[Netlify CPX Hash Generation] ext_user_id=${uid}, app_id=${appId}, secure_hash_enabled=${enabled}, hash=${hash}`);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        success: true,
        app_id: appId,
        ext_user_id: uid,
        secure_hash: hash,
        secure_hash_enabled: enabled
      })
    };
  } catch (err: any) {
    console.error("Error in cpx-hash function:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Internal server error" })
    };
  }
};
