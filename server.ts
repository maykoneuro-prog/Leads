import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Log every single request to debug 405 errors
  app.use((req, res, next) => {
    console.log(`[HTTP] ${req.method} ${req.url} (Original: ${req.originalUrl}) - From: ${req.ip}`);
    next();
  });

  let db_admin: admin.firestore.Firestore | null = null;

  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    
    if (fs.existsSync(configPath)) {
      const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      console.log(`[FIREBASE] Config loaded for: ${firebaseConfig.projectId}`);
      
      if (!admin.apps.length) {
        admin.initializeApp({
          projectId: firebaseConfig.projectId,
        });
        console.log(`[FIREBASE] Admin App initialized`);
      }
      
      const dbId = firebaseConfig.firestoreDatabaseId || "(default)";
      try {
        db_admin = getFirestore(dbId);
        console.log(`[FIREBASE] Admin Firestore reference created (${dbId})`);
      } catch (e) {
        console.warn("[FIREBASE] Admin Firestore initialization skipped:", e);
      }
    }
  } catch (err: any) {
    console.error("[FIREBASE] Critical Initialization Error:", err.message);
  }

  // Helper for REST Auth operations since admin.auth() is restricted in this environment
  const authRest = {
    async signUp(email: string, pass: string) {
      const configPath = path.join(process.cwd(), "firebase-applet-config.json");
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const apiKey = config.apiKey;
      const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;
      
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass, returnSecureToken: true })
      });
      
      const data = await resp.json() as any;
      if (!resp.ok) {
        if (data.error?.message === 'EMAIL_EXISTS') {
          // If exists, try to get UID via login (hacky but works since we know the pass)
          return this.signIn(email, pass);
        }
        throw new Error(data.error?.message || 'Erro no SignUp REST');
      }
      return { uid: data.localId, ...data };
    },
    async signIn(email: string, pass: string) {
      const configPath = path.join(process.cwd(), "firebase-applet-config.json");
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const apiKey = config.apiKey;
      const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
      
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass, returnSecureToken: true })
      });
      
      const data = await resp.json() as any;
      if (!resp.ok) throw new Error(data.error?.message || 'Erro no SignIn REST');
      return { uid: data.localId, ...data };
    },
    async updatePassword(email: string, newPass: string) {
      const configPath = path.join(process.cwd(), "firebase-applet-config.json");
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const apiKey = config.apiKey;
      
      // First get user info to get localId
      const getUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`;
      const getResp = await fetch(getUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: [email] })
      });
      const getData = await getResp.json() as any;
      if (!getResp.ok || !getData.users?.[0]) throw new Error('Usuário não encontrado');
      
      const localId = getData.users[0].localId;
      
      // Then update password
      const updateUrl = `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${apiKey}`;
      const updateResp = await fetch(updateUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ localId, password: newPass, returnSecureToken: false })
      });
      
      const updateData = await updateResp.json() as any;
      if (!updateResp.ok) throw new Error(updateData.error?.message || 'Erro ao atualizar senha');
      return updateData;
    }
  };

  // ... (autoSeed removed or simplified) ...

  // API Routes directly on app
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      firebaseAdmin: !!db_admin,
      timestamp: new Date().toISOString()
    });
  });

  app.post("/api/clear-system-data", async (req, res) => {
    try {
      if (!db_admin) throw new Error("Firestore Admin not initialized");
      
      const leadSnap = await db_admin.collection('leads').get();
      const logSnap = await db_admin.collection('leadLogs').get();
      
      const batch = db_admin.batch();
      leadSnap.docs.forEach(doc => batch.delete(doc.ref));
      logSnap.docs.forEach(doc => batch.delete(doc.ref));
      
      await batch.commit();
      res.json({ success: true, message: "Leads and logs cleared" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sync-auth-users", async (req, res) => {
    console.log(`[SYNC] Request received at ${new Date().toISOString()} from ${req.ip}`);
    try {
      const { users } = req.body;
      if (!users || !Array.isArray(users)) {
        return res.status(400).json({ error: "Invalid users array" });
      }

      for (const u of users) {
        if (u.email && u.email.includes(' ')) {
          return res.status(400).json({ error: `Email inválido: contém espaços (${u.email})` });
        }
      }

      console.log(`[SYNC] Starting sync for ${users.length} users:`, users.map(u => u.email));
      
      const results = await Promise.all(users.map(async (u) => {
        try {
          if (!u.email || !u.pass) return { email: u.email || 'unknown', status: 'error', message: 'Email or password missing' };
          const authRes = await authRest.signUp(u.email, u.pass);
          return { email: u.email, uid: authRes.uid, status: 'synced' };
        } catch (e: any) {
          return { email: u.email, status: 'error', message: e.message };
        }
      }));
      
      res.json({ results });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Unknown server error" });
    }
  });

  app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const userData = await authRest.signIn(email, password);
      res.json({ success: true, uid: userData.uid, email: userData.email });
    } catch (error: any) {
      res.status(401).json({ error: error.message || "Falha no login" });
    }
  });

  app.post("/api/reset-password", async (req, res) => {
    try {
      const { email, newPassword } = req.body;
      await authRest.updatePassword(email, newPassword);
      res.json({ success: true, message: "Senha atualizada com sucesso" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Catch-all for API that didn't match any route
  app.all("/api/*", (req, res) => {
    console.warn(`[API] Unhandled ${req.method} ${req.originalUrl}`);
    res.status(404).json({ 
      error: `Endpoint não encontrado ou método não permitido: ${req.method} ${req.originalUrl}`,
      availableEndpoints: ["/api/health", "/api/sync-auth-users", "/api/login", "/api/reset-password"]
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        host: '0.0.0.0',
        port: 3000
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite middleware active on 0.0.0.0:3000");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    } else {
      console.warn("Dist folder not found. SPA routes might not work.");
      // Fallback for development if someone runs node server.ts without build
      app.get("*", (req, res) => {
        res.status(404).send("Application not built. Please run npm run build.");
      });
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
