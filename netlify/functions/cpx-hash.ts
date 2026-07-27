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

    const secureHashKey = process.env.CPX_HASH_KEY || process.env.CPX_SECURE_HASH_KEY || "YOUR_HASH_KEY";
    const input = `${uid}-${secureHashKey}`;
    const hash = crypto.createHash("md5").update(input).digest("hex");

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        success: true,
        app_id: 34409,
        ext_user_id: uid,
        secure_hash: hash,
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
