import path from "path";
import express from "express";
import cookieParser from "cookie-parser";
import { prisma } from "./db";
import { hashPassword } from "./auth";
import authRoutes from "./routes/auth";
import adminRoutes from "./routes/admin";
import clientRoutes from "./routes/client";

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/client", clientRoutes);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Serve the built React app (web/dist lives alongside server/dist at runtime).
const webDist = path.join(__dirname, "..", "..", "web", "dist");
app.use(express.static(webDist));
app.get(/^(?!\/api\/).*/, (_req, res) => {
  res.sendFile(path.join(webDist, "index.html"));
});

async function bootstrapAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const trainerCount = await prisma.user.count({ where: { role: "TRAINER" } });
  if (trainerCount > 0) return;
  if (!adminEmail || !adminPassword) {
    console.warn(
      "No trainer account exists yet, and ADMIN_EMAIL/ADMIN_PASSWORD are not set — set them and redeploy to create your login."
    );
    return;
  }
  const passwordHash = await hashPassword(adminPassword);
  await prisma.user.create({
    data: {
      email: adminEmail.toLowerCase().trim(),
      passwordHash,
      name: process.env.ADMIN_NAME || "Trainer",
      role: "TRAINER",
    },
  });
  console.log(`Created trainer account for ${adminEmail}`);
}

const PORT = Number(process.env.PORT) || 3000;
bootstrapAdmin()
  .catch((err) => console.error("Failed to bootstrap admin account", err))
  .finally(() => {
    app.listen(PORT, () => console.log(`Server listening on :${PORT}`));
  });
