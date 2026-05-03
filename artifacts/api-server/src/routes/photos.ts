import { Router, type IRouter, type Request, type Response } from "express";
import { db, photosTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { AuthUser } from "../lib/auth";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response, next: () => void) {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

router.post("/photos", requireAuth, async (req: Request, res: Response) => {
  const { data, mimeType } = req.body as { data?: string; mimeType?: string };
  if (!data) {
    res.status(400).json({ error: "data (base64) is required" });
    return;
  }

  const sizeBytes = Math.round((data.length * 3) / 4);
  const [photo] = await db
    .insert(photosTable)
    .values({ data, mimeType: mimeType ?? "image/jpeg", sizeBytes })
    .returning({ id: photosTable.id });

  res.status(201).json({ id: photo.id });
});

router.get("/photos/:id", requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const [photo] = await db
    .select()
    .from(photosTable)
    .where(eq(photosTable.id, id));

  if (!photo) {
    res.status(404).json({ error: "Photo not found" });
    return;
  }

  const buffer = Buffer.from(photo.data, "base64");
  res.set("Content-Type", photo.mimeType);
  res.set("Cache-Control", "private, max-age=31536000, immutable");
  res.set("Content-Length", String(buffer.length));
  res.send(buffer);
});

router.delete("/photos/:id", requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  await db.delete(photosTable).where(eq(photosTable.id, id));
  res.status(204).send();
});

export default router;
