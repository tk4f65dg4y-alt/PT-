import { Router } from "express";
import { prisma } from "../db";
import { requireAuth } from "../auth";

const router = Router();
router.use(requireAuth);

router.get("/", async (_req, res) => {
  const items = await prisma.exerciseLibraryItem.findMany({ orderBy: { name: "asc" } });
  res.json(items);
});

export default router;
