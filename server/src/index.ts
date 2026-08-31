import path from "path";
import express from "express";
import cookieParser from "cookie-parser";
import cron from "node-cron";
import { prisma } from "./db";
import { hashPassword } from "./auth";
import authRoutes from "./routes/auth";
import adminRoutes from "./routes/admin";
import clientRoutes from "./routes/client";
import libraryRoutes from "./routes/library";
import pushRoutes from "./routes/push";
import { seedExerciseLibrary } from "./lib/exerciseLibrary";
import { sendInactivityNudges } from "./lib/nudges";
import { seedHemaSanjPlan } from "./lib/seedHemaSanjPlan";

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/client", clientRoutes);
app.use("/api/library", libraryRoutes);
app.use("/api/push", pushRoutes);

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

// Lets you reset the trainer login's password by setting ADMIN_RESET_PASSWORD
// (and redeploying) instead of needing a "forgot password" flow. Runs on every
// boot; idempotent — it's a no-op once the password already matches.
async function applyAdminPasswordReset() {
  const resetPassword = process.env.ADMIN_RESET_PASSWORD;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!resetPassword || !adminEmail) return;
  const email = adminEmail.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.role !== "TRAINER") return;
  const passwordHash = await hashPassword(resetPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  console.log(`Reset password for trainer account ${email}`);
}

const PORT = Number(process.env.PORT) || 3000;
bootstrapAdmin()
  .then(() => applyAdminPasswordReset())
  .then(() => seedExerciseLibrary())
  .then(() => seedHemaSanjPlan())
  .catch((err) => console.error("Failed to bootstrap admin/library", err))
  .finally(() => {
    app.listen(PORT, () => console.log(`Server listening on :${PORT}`));
    // Daily check for clients who've gone quiet — nudges them by push if
    // they've enabled notifications. 15:00 UTC is an arbitrary fixed time.
    cron.schedule("0 15 * * *", () => {
      sendInactivityNudges().catch((err) => console.error("Inactivity nudge job failed", err));
    });
  });
