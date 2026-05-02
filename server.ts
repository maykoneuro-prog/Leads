import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import admin from "firebase-admin";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  let db: admin.firestore.Firestore | null = null;
  let auth: admin.auth.Auth | null = null;

  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      
      if (!admin.apps.length) {
        admin.initializeApp({
          projectId: firebaseConfig.projectId,
        });
      }
      
      db = admin.firestore(firebaseConfig.firestoreDatabaseId || "(default)");
      auth = admin.auth();
      console.log("Firebase Admin initialized successfully");
    } else {
      console.warn("firebase-applet-config.json not found. Backend features will be limited.");
    }
  } catch (err) {
    console.error("Error initializing Firebase Admin:", err);
  }

  // Auto-seed if database is empty
  const autoSeed = async () => {
    if (!db || !auth) return;
    try {
      const rolesCount = await db.collection('userRoles').limit(1).get();
      if (rolesCount.empty) {
        console.log("Database empty. Starting auto-seed...");
        const schoolsData = [
          { id: 'sesiibura', name: 'SESI Ibura', city: 'Recife', email: 'sesiibura@sesipe.com.br', pass: 'sesiibura@1234' },
          { id: 'sesivasco', name: 'SESI Vasco da Gama', city: 'Recife', email: 'sesivasco@sesipe.com.br', pass: 'sesivasco@1234' },
          { id: 'sesicasa', name: 'SESI Casa Amarela', city: 'Recife', email: 'sesicasa@sesipe.com.br', pass: 'sesicasa@1234' },
          { id: 'sesijaboatao', name: 'SESI Jaboatão', city: 'Jaboatão dos Guararapes', email: 'sesijaboatao@sesipe.com.br', pass: 'sesijaboatao@1234' },
          { id: 'sesicabo', name: 'SESI Cabo', city: 'Cabo de Santo Agostinho', email: 'sesicabo@sesipe.com.br', pass: 'sesicabo@1234' },
          { id: 'sesimoreno', name: 'SESI Moreno', city: 'Moreno', email: 'sesimoreno@sesipe.com.br', pass: 'sesimoreno@1234' },
          { id: 'sesipaulista', name: 'SESI Paulista', city: 'Paulista', email: 'sesipaulista@sesipe.com.br', pass: 'sesipaulista@1234' },
          { id: 'sesigoiana', name: 'SESI Goiana', city: 'Goiana', email: 'sesigoiana@sesipe.com.br', pass: 'sesigoiana@1234' },
          { id: 'sesicaruaru', name: 'SESI Caruaru', city: 'Caruaru', email: 'sesicaruaru@sesipe.com.br', pass: 'sesicaruaru@1234' },
          { id: 'sesigaranhuns', name: 'SESI Garanhuns', city: 'Garanhuns', email: 'sesigaranhuns@sesipe.com.br', pass: 'sesigaranhuns@1234' },
          { id: 'sesiararipina', name: 'SESI Araripina', city: 'Araripina', email: 'sesiararipina@sesipe.com.br', pass: 'sesiararipina@1234' },
          { id: 'sesipetrolina', name: 'SESI Petrolina', city: 'Petrolina', email: 'sesipetrolina@sesipe.com.br', pass: 'sesipetrolina@1234' },
        ];

        const adminEmail = 'administrador@sesipe.com.br';
        const adminPass = 'Abc@1234';
        
        let adminUid = '';
        try {
          const u = await auth.getUserByEmail(adminEmail);
          adminUid = u.uid;
        } catch (e) {
          const u = await auth.createUser({ email: adminEmail, password: adminPass });
          adminUid = u.uid;
        }
        await db.collection('userRoles').doc(adminUid).set({
          email: adminEmail,
          role: 'Admin',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        for (const s of schoolsData) {
          await db.collection('schools').doc(s.id).set({ name: s.name, city: s.city, active: true }, { merge: true });
          let userUid = '';
          try {
            const u = await auth.getUserByEmail(s.email);
            userUid = u.uid;
          } catch (e) {
            const u = await auth.createUser({ email: s.email, password: s.pass });
            userUid = u.uid;
          }
          await db.collection('userRoles').doc(userUid).set({
            email: s.email,
            role: 'SchoolOperator',
            schoolId: s.id,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        }
        
        const courses = [
          { name: 'Educação Infantil' },
          { name: 'Ensino Fundamental I' },
          { name: 'Ensino Fundamental II' },
          { name: 'Ensino Médio' },
          { name: 'EJA' }
        ];
        for (const c of courses) {
          const id = c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
          await db.collection('courses').doc(id).set(c, { merge: true });
        }

        console.log("Auto-seed completed!");
      }
    } catch (err) {
      console.error("Auto-seed failed:", err);
    }
  };

  if (db && auth) autoSeed();

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      firebaseAdmin: !!auth,
      timestamp: new Date().toISOString()
    });
  });

  // API Route to manually seed and DIAGNOSE
  app.post("/api/seed-system", async (req, res) => {
    if (!auth || !db) {
      return res.status(500).json({ error: "Firebase Admin não inicializado. Verifique se o arquivo firebase-applet-config.json existe." });
    }
    try {
      console.log("[SEED] Starting manual seed request...");
      const schoolsData = [
        { id: 'sesiibura', name: 'SESI Ibura', city: 'Recife', email: 'sesiibura@sesipe.com.br', pass: 'sesiibura@1234' },
        { id: 'sesivasco', name: 'SESI Vasco da Gama', city: 'Recife', email: 'sesivasco@sesipe.com.br', pass: 'sesivasco@1234' },
        { id: 'sesicasa', name: 'SESI Casa Amarela', city: 'Recife', email: 'sesicasa@sesipe.com.br', pass: 'sesicasa@1234' },
        { id: 'sesijaboatao', name: 'SESI Jaboatão', city: 'Jaboatão dos Guararapes', email: 'sesijaboatao@sesipe.com.br', pass: 'sesijaboatao@1234' },
        { id: 'sesicabo', name: 'SESI Cabo', city: 'Cabo de Santo Agostinho', email: 'sesicabo@sesipe.com.br', pass: 'sesicabo@1234' },
        { id: 'sesimoreno', name: 'SESI Moreno', city: 'Moreno', email: 'sesimoreno@sesipe.com.br', pass: 'sesimoreno@1234' },
        { id: 'sesipaulista', name: 'SESI Paulista', city: 'Paulista', email: 'sesipaulista@sesipe.com.br', pass: 'sesipaulista@1234' },
        { id: 'sesigoiana', name: 'SESI Goiana', city: 'Goiana', email: 'sesigoiana@sesipe.com.br', pass: 'sesigoiana@1234' },
        { id: 'sesicaruaru', name: 'SESI Caruaru', city: 'Caruaru', email: 'sesicaruaru@sesipe.com.br', pass: 'sesicaruaru@1234' },
        { id: 'sesigaranhuns', name: 'SESI Garanhuns', city: 'Garanhuns', email: 'sesigaranhuns@sesipe.com.br', pass: 'sesigaranhuns@1234' },
        { id: 'sesiararipina', name: 'SESI Araripina', city: 'Araripina', email: 'sesiararipina@sesipe.com.br', pass: 'sesiararipina@1234' },
        { id: 'sesipetrolina', name: 'SESI Petrolina', city: 'Petrolina', email: 'sesipetrolina@sesipe.com.br', pass: 'sesipetrolina@1234' },
      ];

      const adminEmail = 'administrador@sesipe.com.br';
      const adminPass = 'Abc@1234';
      
      console.log("Admin email targeted:", adminEmail);
      let adminUid = '';
      try {
        const u = await auth.getUserByEmail(adminEmail);
        adminUid = u.uid;
        await auth.updateUser(adminUid, { password: adminPass });
        console.log("Admin user password updated successfully");
      } catch (e: any) {
        if (e.code === 'auth/user-not-found') {
          const u = await auth.createUser({ email: adminEmail, password: adminPass });
          adminUid = u.uid;
          console.log("Admin user created successfully");
        } else {
          throw e;
        }
      }
      
      console.log("Assigning role to admin UID:", adminUid);
      await db.collection('userRoles').doc(adminUid).set({
        email: adminEmail,
        role: 'Admin',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      for (const s of schoolsData) {
        await db.collection('schools').doc(s.id).set({ name: s.name, city: s.city, active: true }, { merge: true });
        let userUid = '';
        try {
          const u = await auth.getUserByEmail(s.email);
          userUid = u.uid;
          await auth.updateUser(userUid, { password: s.pass });
        } catch (e) {
          const u = await auth.createUser({ email: s.email, password: s.pass });
          userUid = u.uid;
        }
        await db.collection('userRoles').doc(userUid).set({
          email: s.email,
          role: 'SchoolOperator',
          schoolId: s.id,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }

      console.log("Manual seed finished successfully");
      res.json({ message: "Usuários e unidades inicializados com sucesso! Tente o login novamente com administrador / Abc@1234" });
    } catch (error) {
      console.error("Manual Seed Error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : String(error),
        details: "Isso pode ocorrer se as APIs do Firebase Auth/Firestore não estiverem ativadas ou se houver erro de permissão."
      });
    }
  });

  // Login Proxy to avoid client-side network issues
  app.post("/api/login", async (req, res) => {
    console.log(`[LOGIN] Attempt for: ${req.body.email}`);
    if (!auth || !db) {
      console.error("[LOGIN] Firebase not initialized");
      return res.status(500).json({ error: "Firebase não inicializado no servidor" });
    }
    
    const { email, password } = req.body;
    
    try {
      // Step 1: Find user by email
      let user;
      try {
        console.log(`[LOGIN] Verifying user existence: ${email}`);
        user = await auth.getUserByEmail(email);
        console.log(`[LOGIN] User found with uid: ${user.uid}`);
      } catch (e: any) {
        console.warn(`[LOGIN] User not found or error: ${e.message}`);
        return res.status(401).json({ error: 'Usuário não cadastrado no sistema.', code: 'auth/user-not-found' });
      }

      // Step 2: Authenticate via REST API
      const configPath = path.join(process.cwd(), "firebase-applet-config.json");
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const apiKey = config.apiKey;
      const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
      
      console.log(`[LOGIN] Calling Identity Toolkit for ${email}...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      try {
        const loginResp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, returnSecureToken: true }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        const loginData = await loginResp.json() as any;
        
        if (!loginResp.ok) {
          const errorMsg = loginData.error?.message || 'Falha na autenticação';
          console.warn(`[LOGIN] Identity Toolkit rejected ${email}: ${errorMsg}`);
          return res.status(401).json({ 
            error: errorMsg.includes('INVALID_PASSWORD') ? 'Senha incorreta.' : 'Credenciais inválidas.', 
            code: errorMsg.includes('INVALID_PASSWORD') ? 'auth/wrong-password' : 'auth/invalid-credential'
          });
        }

        console.log(`[LOGIN] Success at Identity Toolkit for ${email}`);

        // Step 3: Create a custom token
        const customToken = await auth.createCustomToken(user.uid);
        console.log(`[LOGIN] Custom token generated for ${user.uid}`);
        res.json({ customToken });
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        if (fetchErr.name === 'AbortError') {
          console.error("[LOGIN] Identity Toolkit request timed out");
          throw new Error("O serviço de autenticação demorou muito para responder. Tente novamente.");
        }
        throw fetchErr;
      }
    } catch (error: any) {
      console.error("[LOGIN] Global Error:", error);
      res.status(500).json({ error: error.message || "Erro interno no servidor de login" });
    }
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
