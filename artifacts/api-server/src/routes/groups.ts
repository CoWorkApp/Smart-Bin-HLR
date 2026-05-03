import { Router, type IRouter, type Request, type Response } from "express";
import { db, groupsTable, groupMembersTable, locationsTable, binsTable, itemsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import type { AuthUser } from "../lib/auth";

// Type-safe param extraction (Express params are string | string[] without generic)
function p(req: Request): Record<string, string> {
  return req.params as Record<string, string>;
}

// Type-safe user id extraction
function uid(req: Request): string {
  return (req.user as AuthUser).id;
}

const router: IRouter = Router();

// Middleware: ensure user is authenticated
function requireAuth(req: Request, res: Response, next: () => void) {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

// Check group membership and return role
async function getGroupRole(groupId: string, userId: string) {
  const [member] = await db
    .select()
    .from(groupMembersTable)
    .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, userId)));
  return member?.role ?? null;
}

// ── Groups ────────────────────────────────────────────────────────────────────

// GET /api/groups
router.get("/groups", requireAuth, async (req: Request, res: Response) => {
  const userId = uid(req);
  const memberships = await db
    .select({ groupId: groupMembersTable.groupId, role: groupMembersTable.role })
    .from(groupMembersTable)
    .where(eq(groupMembersTable.userId, userId));

  if (memberships.length === 0) {
    res.json({ groups: [] });
    return;
  }

  const groups = await Promise.all(
    memberships.map(async (m) => {
      const [g] = await db.select().from(groupsTable).where(eq(groupsTable.id, m.groupId));
      if (!g) return null;
      return { ...g, role: m.role };
    }),
  );

  res.json({ groups: groups.filter(Boolean) });
});

// POST /api/groups
router.post("/groups", requireAuth, async (req: Request, res: Response) => {
  const userId = uid(req);
  const { id, name, type } = req.body as { id?: string; name: string; type: string };
  if (!name || !type) {
    res.status(400).json({ error: "name and type are required" });
    return;
  }

  const [group] = await db
    .insert(groupsTable)
    .values({ ...(id ? { id } : {}), name, type })
    .returning();

  await db.insert(groupMembersTable).values({ groupId: group.id, userId, role: "admin" });

  res.status(201).json({ group: { ...group, role: "admin" } });
});

// GET /api/groups/:groupId
router.get("/groups/:groupId", requireAuth, async (req: Request, res: Response) => {
  const userId = uid(req);
  const { groupId } = p(req);
  const role = await getGroupRole(groupId, userId);
  if (!role) { res.status(404).json({ error: "Not found" }); return; }
  const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId));
  if (!group) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ group: { ...group, role } });
});

// PUT /api/groups/:groupId
router.put("/groups/:groupId", requireAuth, async (req: Request, res: Response) => {
  const userId = uid(req);
  const { groupId } = p(req);
  const role = await getGroupRole(groupId, userId);
  if (!role) { res.status(404).json({ error: "Not found" }); return; }
  if (role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

  const { name, type } = req.body as { name?: string; type?: string };
  const updates: Record<string, string> = {};
  if (name) updates.name = name;
  if (type) updates.type = type;

  const [updated] = await db.update(groupsTable).set(updates).where(eq(groupsTable.id, groupId)).returning();
  res.json({ group: { ...updated, role } });
});

// DELETE /api/groups/:groupId
router.delete("/groups/:groupId", requireAuth, async (req: Request, res: Response) => {
  const userId = uid(req);
  const { groupId } = p(req);
  const role = await getGroupRole(groupId, userId);
  if (!role) { res.status(404).json({ error: "Not found" }); return; }
  if (role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }
  await db.delete(groupsTable).where(eq(groupsTable.id, groupId));
  res.status(204).send();
});

// ── Locations ────────────────────────────────────────────────────────────────

// GET /api/groups/:groupId/locations
router.get("/groups/:groupId/locations", requireAuth, async (req: Request, res: Response) => {
  const userId = uid(req);
  const { groupId } = p(req);
  const role = await getGroupRole(groupId, userId);
  if (!role) { res.status(404).json({ error: "Not found" }); return; }
  const locations = await db.select().from(locationsTable).where(eq(locationsTable.groupId, groupId));
  res.json({ locations });
});

// POST /api/groups/:groupId/locations
router.post("/groups/:groupId/locations", requireAuth, async (req: Request, res: Response) => {
  const userId = uid(req);
  const { groupId } = p(req);
  const role = await getGroupRole(groupId, userId);
  if (!role) { res.status(404).json({ error: "Not found" }); return; }
  const { id, name, parentId } = req.body as { id?: string; name: string; parentId?: string | null };
  if (!name) { res.status(400).json({ error: "name is required" }); return; }
  const [location] = await db
    .insert(locationsTable)
    .values({ ...(id ? { id } : {}), groupId, name, parentId: parentId ?? null })
    .returning();
  res.status(201).json({ location });
});

// PUT /api/groups/:groupId/locations/:locationId
router.put("/groups/:groupId/locations/:locationId", requireAuth, async (req: Request, res: Response) => {
  const userId = uid(req);
  const { groupId, locationId } = p(req);
  const role = await getGroupRole(groupId, userId);
  if (!role) { res.status(404).json({ error: "Not found" }); return; }
  const { name, parentId, qrCode } = req.body as { name?: string; parentId?: string | null; qrCode?: string | null };
  const updates: Record<string, string | null> = {};
  if (name !== undefined) updates.name = name;
  if (parentId !== undefined) updates.parentId = parentId;
  if (qrCode !== undefined) updates.qrCode = qrCode;
  const [updated] = await db
    .update(locationsTable)
    .set(updates)
    .where(and(eq(locationsTable.id, locationId), eq(locationsTable.groupId, groupId)))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ location: updated });
});

// DELETE /api/groups/:groupId/locations/:locationId
router.delete("/groups/:groupId/locations/:locationId", requireAuth, async (req: Request, res: Response) => {
  const userId = uid(req);
  const { groupId, locationId } = p(req);
  const role = await getGroupRole(groupId, userId);
  if (!role) { res.status(404).json({ error: "Not found" }); return; }
  await db.delete(locationsTable).where(and(eq(locationsTable.id, locationId), eq(locationsTable.groupId, groupId)));
  res.status(204).send();
});

// ── Bins ─────────────────────────────────────────────────────────────────────

// GET /api/groups/:groupId/bins
router.get("/groups/:groupId/bins", requireAuth, async (req: Request, res: Response) => {
  const userId = uid(req);
  const { groupId } = p(req);
  const role = await getGroupRole(groupId, userId);
  if (!role) { res.status(404).json({ error: "Not found" }); return; }
  const bins = await db.select().from(binsTable).where(eq(binsTable.groupId, groupId));
  res.json({ bins });
});

// POST /api/groups/:groupId/bins
router.post("/groups/:groupId/bins", requireAuth, async (req: Request, res: Response) => {
  const userId = uid(req);
  const { groupId } = p(req);
  const role = await getGroupRole(groupId, userId);
  if (!role) { res.status(404).json({ error: "Not found" }); return; }
  const { id, name, locationId, qrCode } = req.body as { id?: string; name: string; locationId: string; qrCode?: string | null };
  if (!name || !locationId) { res.status(400).json({ error: "name and locationId are required" }); return; }
  const [bin] = await db
    .insert(binsTable)
    .values({ ...(id ? { id } : {}), groupId, locationId, name, qrCode: qrCode ?? null })
    .returning();
  res.status(201).json({ bin });
});

// PUT /api/groups/:groupId/bins/:binId
router.put("/groups/:groupId/bins/:binId", requireAuth, async (req: Request, res: Response) => {
  const userId = uid(req);
  const { groupId, binId } = p(req);
  const role = await getGroupRole(groupId, userId);
  if (!role) { res.status(404).json({ error: "Not found" }); return; }
  const { name, locationId, qrCode } = req.body as { name?: string; locationId?: string; qrCode?: string | null };
  const updates: Record<string, string | null> = {};
  if (name !== undefined) updates.name = name;
  if (locationId !== undefined) updates.locationId = locationId;
  if (qrCode !== undefined) updates.qrCode = qrCode;
  const [updated] = await db
    .update(binsTable)
    .set(updates)
    .where(and(eq(binsTable.id, binId), eq(binsTable.groupId, groupId)))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ bin: updated });
});

// DELETE /api/groups/:groupId/bins/:binId
router.delete("/groups/:groupId/bins/:binId", requireAuth, async (req: Request, res: Response) => {
  const userId = uid(req);
  const { groupId, binId } = p(req);
  const role = await getGroupRole(groupId, userId);
  if (!role) { res.status(404).json({ error: "Not found" }); return; }
  await db.delete(binsTable).where(and(eq(binsTable.id, binId), eq(binsTable.groupId, groupId)));
  res.status(204).send();
});

// ── Items ─────────────────────────────────────────────────────────────────────

// GET /api/groups/:groupId/items
router.get("/groups/:groupId/items", requireAuth, async (req: Request, res: Response) => {
  const userId = uid(req);
  const { groupId } = p(req);
  const { q, binId: filterBinId } = req.query as { q?: string; binId?: string };
  const role = await getGroupRole(groupId, userId);
  if (!role) { res.status(404).json({ error: "Not found" }); return; }

  let rows = await db.select().from(itemsTable).where(eq(itemsTable.groupId, groupId));

  if (filterBinId) rows = rows.filter((i) => i.binId === filterBinId);
  if (q) {
    const lower = q.toLowerCase();
    rows = rows.filter((i) => i.name.toLowerCase().includes(lower));
  }

  res.json({ items: rows });
});

// POST /api/groups/:groupId/items
router.post("/groups/:groupId/items", requireAuth, async (req: Request, res: Response) => {
  const userId = uid(req);
  const { groupId } = p(req);
  const role = await getGroupRole(groupId, userId);
  if (!role) { res.status(404).json({ error: "Not found" }); return; }

  const { id, name, binId, photo, qrCode } = req.body as {
    id?: string; name: string; binId: string; photo?: string | null; qrCode?: string | null;
  };
  if (!name || !binId) { res.status(400).json({ error: "name and binId are required" }); return; }

  const [item] = await db
    .insert(itemsTable)
    .values({ ...(id ? { id } : {}), groupId, binId, name, photo: photo ?? null, qrCode: qrCode ?? null })
    .returning();
  res.status(201).json({ item });
});

// PUT /api/groups/:groupId/items/:itemId
router.put("/groups/:groupId/items/:itemId", requireAuth, async (req: Request, res: Response) => {
  const userId = uid(req);
  const { groupId, itemId } = p(req);
  const role = await getGroupRole(groupId, userId);
  if (!role) { res.status(404).json({ error: "Not found" }); return; }
  const { name, binId, photo, qrCode } = req.body as {
    name?: string; binId?: string; photo?: string | null; qrCode?: string | null;
  };
  const updates: Record<string, string | null> = {};
  if (name !== undefined) updates.name = name;
  if (binId !== undefined) updates.binId = binId;
  if (photo !== undefined) updates.photo = photo;
  if (qrCode !== undefined) updates.qrCode = qrCode;
  const [updated] = await db
    .update(itemsTable)
    .set(updates)
    .where(and(eq(itemsTable.id, itemId), eq(itemsTable.groupId, groupId)))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ item: updated });
});

// DELETE /api/groups/:groupId/items/:itemId
router.delete("/groups/:groupId/items/:itemId", requireAuth, async (req: Request, res: Response) => {
  const userId = uid(req);
  const { groupId, itemId } = p(req);
  const role = await getGroupRole(groupId, userId);
  if (!role) { res.status(404).json({ error: "Not found" }); return; }
  await db.delete(itemsTable).where(and(eq(itemsTable.id, itemId), eq(itemsTable.groupId, groupId)));
  res.status(204).send();
});

// ── QR Lookup ─────────────────────────────────────────────────────────────────

// GET /api/qr/:qrCode
router.get("/qr/:qrCode", requireAuth, async (req: Request, res: Response) => {
  const userId = uid(req);
  const { qrCode } = p(req);

  const memberships = await db
    .select({ groupId: groupMembersTable.groupId })
    .from(groupMembersTable)
    .where(eq(groupMembersTable.userId, userId));
  const groupIds = memberships.map((m) => m.groupId);

  for (const groupId of groupIds) {
    const [bin] = await db
      .select()
      .from(binsTable)
      .where(and(eq(binsTable.qrCode, qrCode), eq(binsTable.groupId, groupId)));
    if (bin) { res.json({ type: "bin", id: bin.id, groupId }); return; }

    const [loc] = await db
      .select()
      .from(locationsTable)
      .where(and(eq(locationsTable.qrCode, qrCode), eq(locationsTable.groupId, groupId)));
    if (loc) { res.json({ type: "location", id: loc.id, groupId }); return; }

    const [item] = await db
      .select()
      .from(itemsTable)
      .where(and(eq(itemsTable.qrCode, qrCode), eq(itemsTable.groupId, groupId)));
    if (item) { res.json({ type: "item", id: item.id, groupId }); return; }
  }

  res.status(404).json({ error: "QR code not found" });
});

export default router;
