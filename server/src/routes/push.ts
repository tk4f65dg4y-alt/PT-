import { Router } from "express";
import { prisma } from "../db";
import { requireAuth } from "../auth";
import { pushConfigured } from "../lib/push";

const router = Router();

router.get("/vapid-public-key", (_req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY || null, enabled: pushConfigured });
});

router.use(requireAuth);

router.post("/subscribe", async (req, res) => {
  const { endpoint, keys } = req.body || {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: "Invalid subscription" });
  }
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, userId: req.user!.id },
    update: { p256dh: keys.p256dh, auth: keys.auth, userId: req.user!.id },
  });
  res.status(201).json({ ok: true });
});

router.post("/unsubscribe", async (req, res) => {
  const { endpoint } = req.body || {};
  if (endpoint) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: req.user!.id } });
  }
  res.json({ ok: true });
});

export default router;
