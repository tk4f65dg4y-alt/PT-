import { Router } from "express";
import { prisma } from "../db";
import { verifyPassword, issueToken, clearToken, requireAuth } from "../auth";

const router = Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  const user = await prisma.user.findUnique({ where: { email: String(email).toLowerCase().trim() } });
  if (!user) return res.status(401).json({ error: "Invalid email or password" });
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid email or password" });
  issueToken(res, user.id);
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

router.post("/logout", (_req, res) => {
  clearToken(res);
  res.json({ ok: true });
});

router.get("/me", requireAuth, async (req, res) => {
  res.json(req.user);
});

export default router;
