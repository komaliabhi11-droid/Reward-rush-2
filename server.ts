import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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
