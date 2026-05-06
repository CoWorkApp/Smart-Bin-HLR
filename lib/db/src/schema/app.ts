import { pgTable, varchar, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";

// ── Groups ──────────────────────────────────────────────────────────────────

export const groupsTable = pgTable("groups", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 20 }).notNull().default("family"), // "family" | "business"
  inviteCode: varchar("invite_code", { length: 12 }).unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const groupMembersTable = pgTable("group_members", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  groupId: varchar("group_id", { length: 36 }).notNull().references(() => groupsTable.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull().default("member"), // "admin" | "member"
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Locations ────────────────────────────────────────────────────────────────

export const locationsTable = pgTable("locations", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  groupId: varchar("group_id", { length: 36 }).notNull().references(() => groupsTable.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  parentId: varchar("parent_id", { length: 36 }), // self-referential, nullable
  qrCode: varchar("qr_code", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// ── Bins ─────────────────────────────────────────────────────────────────────

export const binsTable = pgTable("bins", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  groupId: varchar("group_id", { length: 36 }).notNull().references(() => groupsTable.id, { onDelete: "cascade" }),
  locationId: varchar("location_id", { length: 36 }).notNull().references(() => locationsTable.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  qrCode: varchar("qr_code", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// ── Items ─────────────────────────────────────────────────────────────────────

export const itemsTable = pgTable("items", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  groupId: varchar("group_id", { length: 36 }).notNull().references(() => groupsTable.id, { onDelete: "cascade" }),
  binId: varchar("bin_id", { length: 36 }).notNull().references(() => binsTable.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  photo: text("photo"),
  qrCode: varchar("qr_code", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// ── Photos ───────────────────────────────────────────────────────────────────

export const photosTable = pgTable("photos", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  data: text("data").notNull(),
  mimeType: varchar("mime_type", { length: 50 }).notNull().default("image/jpeg"),
  sizeBytes: integer("size_bytes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Photo = typeof photosTable.$inferSelect;

// ── Coupons ───────────────────────────────────────────────────────────────────

export const couponsTable = pgTable("coupons", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  code: varchar("code", { length: 50 }).notNull().unique(),
  plan: varchar("plan", { length: 20 }).notNull(), // "lite" | "pro"
  durationMonths: varchar("duration_months", { length: 4 }).notNull().default("3"),
  maxUses: varchar("max_uses", { length: 10 }).notNull().default("1"),
  usesCount: varchar("uses_count", { length: 10 }).notNull().default("0"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const couponRedemptionsTable = pgTable("coupon_redemptions", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  couponId: varchar("coupon_id", { length: 36 }).notNull().references(() => couponsTable.id),
  userId: varchar("user_id").notNull().references(() => usersTable.id),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Zod schemas ───────────────────────────────────────────────────────────────

export const insertGroupSchema = createInsertSchema(groupsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLocationSchema = createInsertSchema(locationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBinSchema = createInsertSchema(binsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertItemSchema = createInsertSchema(itemsTable).omit({ id: true, createdAt: true, updatedAt: true });

export type Group = typeof groupsTable.$inferSelect;
export type GroupMember = typeof groupMembersTable.$inferSelect;
export type Location = typeof locationsTable.$inferSelect;
export type Bin = typeof binsTable.$inferSelect;
export type Item = typeof itemsTable.$inferSelect;
export type Coupon = typeof couponsTable.$inferSelect;
export type CouponRedemption = typeof couponRedemptionsTable.$inferSelect;

export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type InsertBin = z.infer<typeof insertBinSchema>;
export type InsertItem = z.infer<typeof insertItemSchema>;
