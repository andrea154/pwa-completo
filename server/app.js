// src/app.js
import express from "express";
import morgan from "morgan";
import cors from "cors";
import taskRoutes from "./src/routes/task.routes.js";
import authRoutes from "./src/routes/auth.routes.js";
import pushRoutes from "./src/routes/push.routes.js";
import cronRoutes from "./src/routes/cron.routes.js";
import { connectToDB } from "./src/db/connect.js";

const app = express();

// ---------- CORS ----------
// Normaliza un origen: sin espacios, sin comillas, sin "/" final, en minúsculas.
// Así, errores al escribir la variable en Vercel no rompen CORS.
const normalize = (o) => o.trim().replace(/^["']|["']$/g, "").replace(/\/+$/, "").toLowerCase();

// FRONT_ORIGIN acepta varios orígenes separados por coma (producción + previews).
const allowedOrigins = (process.env.FRONT_ORIGIN || "")
  .split(",")
  .map(normalize)
  .filter(Boolean);

// En local aceptamos cualquier puerto de localhost (Vite cambia de puerto
// si el 5173 está ocupado). En Vercel solo se permite lo de FRONT_ORIGIN.
const isLocalhost = (o) => /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);

app.use(
  cors({
    origin(origin, callback) {
      // Postman, curl y el cron no mandan origin: CORS no aplica para ellos
      if (!origin) return callback(null, true);

      const o = normalize(origin);
      const allowed = allowedOrigins.includes(o) || (!process.env.VERCEL && isLocalhost(o));

      if (!allowed) {
        // Aparece en Vercel → Logs: dice exactamente qué llegó y qué se esperaba
        console.warn(`CORS rechazado: "${origin}". Permitidos: ${JSON.stringify(allowedOrigins)}`);
      }
      callback(null, allowed);
    },
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(morgan(process.env.VERCEL ? "tiny" : "dev"));

// Health check (no necesita base de datos). Los orígenes no son secretos.
app.get("/", (_req, res) =>
  res.json({ ok: true, name: "todo-pwa-api", corsOrigins: allowedOrigins })
);

// Conexión a Mongo cacheada (segura en serverless).
// Express 5 manda automáticamente los errores async al manejador de abajo.
app.use(async (_req, _res, next) => {
  await connectToDB();
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/push", pushRoutes);
app.use("/api/cron", cronRoutes);

// 404 en JSON (antes Express respondía HTML)
app.use((_req, res) => res.status(404).json({ message: "Ruta no encontrada" }));

// Manejador de errores central: un solo lugar para responder errores
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  let status = err.status || err.statusCode || 500;
  if (err.name === "ValidationError" || err.name === "CastError") status = 400;

  if (status >= 500) console.error(err);
  res.status(status).json({
    message: status >= 500 ? "Error del servidor" : err.message,
  });
});

export default app;