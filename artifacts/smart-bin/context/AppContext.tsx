import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { apiFetch, genId } from "@/lib/apiClient";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Group {
  id: string;
  name: string;
  type: "family" | "business";
  role: "admin" | "member";
  createdAt: number;
}

export interface Location {
  id: string;
  groupId: string;
  name: string;
  parentId: string | null;
  qrCode?: string;
  createdAt: number;
}

export interface Bin {
  id: string;
  groupId: string;
  locationId: string | null;
  name: string;
  qrCode?: string;
  createdAt: number;
}

export interface Item {
  id: string;
  groupId: string;
  binId: string | null;
  name: string;
  photo?: string;
  qrCode?: string;
  createdAt: number;
  updatedAt: number;
}

export interface SearchResult {
  item: Item;
  bin?: Bin;
  locationPath: Location[];
}

interface AppContextValue {
  groups: Group[];
  activeGroupId: string | null;
  activeGroup: Group | null;
  setActiveGroupId: (id: string) => void;
  addGroup: (name: string, type: Group["type"]) => Group;
  updateGroup: (id: string, updates: Partial<Group>) => void;
  deleteGroup: (id: string) => void;

  locations: Location[];
  getGroupLocations: (groupId?: string) => Location[];
  getRootLocations: (groupId?: string) => Location[];
  getChildLocations: (parentId: string) => Location[];
  getLocationPath: (locationId: string) => Location[];
  addLocation: (name: string, parentId?: string | null, qrCode?: string) => Location;
  updateLocation: (id: string, updates: Partial<Location>) => void;
  deleteLocation: (id: string) => void;

  bins: Bin[];
  getGroupBins: (groupId?: string) => Bin[];
  getLocationBins: (locationId: string) => Bin[];
  getUnmappedBins: () => Bin[];
  addBin: (name: string, locationId?: string | null, qrCode?: string) => Bin;
  updateBin: (id: string, updates: Partial<Bin>) => void;
  deleteBin: (id: string) => void;
  moveBin: (binId: string, locationId: string) => void;

  items: Item[];
  getGroupItems: (groupId?: string) => Item[];
  getBinItems: (binId: string) => Item[];
  getUnmappedItems: () => Item[];
  addItem: (name: string, binId?: string | null, photo?: string, qrCode?: string) => Item;
  updateItem: (id: string, updates: Partial<Item>) => void;
  deleteItem: (id: string) => void;
  moveItem: (itemId: string, binId: string) => void;

  searchItems: (query: string) => SearchResult[];
  lookupQR: (qrCode: string) => { type: "bin" | "location" | "item"; id: string } | null;

  isLoading: boolean;
  refreshFromCloud: () => Promise<void>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toTs(d: string | Date | null | undefined): number {
  if (!d) return Date.now();
  return typeof d === "string" ? new Date(d).getTime() : (d as Date).getTime();
}

function normalizeGroup(g: Record<string, unknown>): Group {
  return {
    id: g.id as string,
    name: g.name as string,
    type: (g.type as Group["type"]) ?? "family",
    role: (g.role as Group["role"]) ?? "admin",
    createdAt: toTs(g.createdAt as string),
  };
}
function normalizeLocation(l: Record<string, unknown>): Location {
  return {
    id: l.id as string,
    groupId: l.groupId as string,
    name: l.name as string,
    parentId: (l.parentId as string | null) ?? null,
    qrCode: (l.qrCode as string | null) ?? undefined,
    createdAt: toTs(l.createdAt as string),
  };
}
function normalizeBin(b: Record<string, unknown>): Bin {
  return {
    id: b.id as string,
    groupId: b.groupId as string,
    locationId: (b.locationId as string | null) ?? null,
    name: b.name as string,
    qrCode: (b.qrCode as string | null) ?? undefined,
    createdAt: toTs(b.createdAt as string),
  };
}
function normalizeItem(i: Record<string, unknown>): Item {
  return {
    id: i.id as string,
    groupId: i.groupId as string,
    binId: (i.binId as string | null) ?? null,
    name: i.name as string,
    photo: (i.photo as string | null) ?? undefined,
    qrCode: (i.qrCode as string | null) ?? undefined,
    createdAt: toTs(i.createdAt as string),
    updatedAt: toTs(i.updatedAt as string),
  };
}

const ACTIVE_GROUP_KEY = "@smartbin:activeGroupId";

// ─── Context ──────────────────────────────────────────────────────────────────

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroupId, setActiveGroupIdState] = useState<string | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [bins, setBins] = useState<Bin[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  // Track active group ID in a ref so async callbacks can read latest value
  const activeGroupRef = useRef<string | null>(null);
  activeGroupRef.current = activeGroupId;

  // ── Cloud load ─────────────────────────────────────────────────────────────

  const loadGroupData = useCallback(async (groupId: string) => {
    const [{ locations: locs }, { bins: bs }, { items: its }] = await Promise.all([
      apiFetch<{ locations: Record<string, unknown>[] }>(`/groups/${groupId}/locations`),
      apiFetch<{ bins: Record<string, unknown>[] }>(`/groups/${groupId}/bins`),
      apiFetch<{ items: Record<string, unknown>[] }>(`/groups/${groupId}/items`),
    ]);
    setLocations(locs.map(normalizeLocation));
    setBins(bs.map(normalizeBin));
    setItems(its.map(normalizeItem));
  }, []);

  const loadFromCloud = useCallback(async () => {
    setIsLoading(true);
    try {
      const { groups: apiGroups } = await apiFetch<{ groups: Record<string, unknown>[] }>("/groups");
      let loadedGroups = apiGroups.map(normalizeGroup);

      if (loadedGroups.length === 0) {
        const { group: created } = await apiFetch<{ group: Record<string, unknown> }>("/groups", {
          method: "POST",
          body: JSON.stringify({ name: "My Home", type: "family" }),
        });
        loadedGroups = [normalizeGroup({ ...created, role: "admin" })];
      }

      setGroups(loadedGroups);

      const savedId = await AsyncStorage.getItem(ACTIVE_GROUP_KEY);
      const activeId =
        loadedGroups.find((g) => g.id === savedId)?.id ?? loadedGroups[0]?.id ?? null;
      setActiveGroupIdState(activeId);

      if (activeId) {
        await loadGroupData(activeId);
      }
    } catch (err) {
      console.warn("[AppContext] Failed to load from cloud:", err);
    } finally {
      setIsLoading(false);
    }
  }, [loadGroupData]);

  const refreshFromCloud = useCallback(async () => {
    await loadFromCloud();
  }, [loadFromCloud]);

  useEffect(() => {
    if (!isAuthenticated) {
      setGroups([]);
      setLocations([]);
      setBins([]);
      setItems([]);
      setActiveGroupIdState(null);
      setIsLoading(false);
      return;
    }
    loadFromCloud();
  }, [isAuthenticated, user?.id]);

  // Reload data when active group changes
  useEffect(() => {
    if (!isAuthenticated || !activeGroupId) return;
    loadGroupData(activeGroupId).catch(console.warn);
  }, [activeGroupId]);

  // ── Active group ───────────────────────────────────────────────────────────

  const setActiveGroupId = useCallback((id: string) => {
    setActiveGroupIdState(id);
    AsyncStorage.setItem(ACTIVE_GROUP_KEY, id);
  }, []);

  // ── Groups ─────────────────────────────────────────────────────────────────

  const addGroup = useCallback((name: string, type: Group["type"]): Group => {
    const id = genId();
    const group: Group = { id, name, type, role: "admin", createdAt: Date.now() };
    setGroups((prev) => [...prev, group]);
    apiFetch<{ group: Record<string, unknown> }>("/groups", {
      method: "POST",
      body: JSON.stringify({ id, name, type }),
    }).catch(console.warn);
    return group;
  }, []);

  const updateGroup = useCallback((id: string, updates: Partial<Group>) => {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)));
    apiFetch(`/groups/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    }).catch(console.warn);
  }, []);

  const deleteGroup = useCallback((id: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== id));
    setLocations((prev) => prev.filter((l) => l.groupId !== id));
    setBins((prev) => prev.filter((b) => b.groupId !== id));
    setItems((prev) => prev.filter((i) => i.groupId !== id));
    apiFetch(`/groups/${id}`, { method: "DELETE" }).catch(console.warn);
  }, []);

  // ── Locations ──────────────────────────────────────────────────────────────

  const getGroupLocations = useCallback(
    (groupId?: string) => locations.filter((l) => l.groupId === (groupId ?? activeGroupId)),
    [locations, activeGroupId],
  );

  const getRootLocations = useCallback(
    (groupId?: string) =>
      locations.filter((l) => l.groupId === (groupId ?? activeGroupId) && l.parentId === null),
    [locations, activeGroupId],
  );

  const getChildLocations = useCallback(
    (parentId: string) => locations.filter((l) => l.parentId === parentId),
    [locations],
  );

  const getLocationPath = useCallback(
    (locationId: string | null): Location[] => {
      if (!locationId) return [];
      const path: Location[] = [];
      let current = locations.find((l) => l.id === locationId);
      while (current) {
        path.unshift(current);
        const pid = current.parentId;
        current = pid ? locations.find((l) => l.id === pid) : undefined;
      }
      return path;
    },
    [locations],
  );

  const addLocation = useCallback(
    (name: string, parentId?: string | null, qrCode?: string): Location => {
      const id = genId();
      const loc: Location = {
        id,
        groupId: activeGroupRef.current!,
        name,
        parentId: parentId ?? null,
        qrCode,
        createdAt: Date.now(),
      };
      setLocations((prev) => [...prev, loc]);
      apiFetch(`/groups/${loc.groupId}/locations`, {
        method: "POST",
        body: JSON.stringify({ id, name, parentId: parentId ?? null, qrCode: qrCode ?? null }),
      })
        .then((data: unknown) => {
          const res = data as { location: Record<string, unknown> };
          const serverLoc = normalizeLocation(res.location);
          setLocations((prev) =>
            prev.map((l) => (l.id === id ? { ...serverLoc } : l)),
          );
        })
        .catch(console.warn);
      return loc;
    },
    [],
  );

  const updateLocation = useCallback((id: string, updates: Partial<Location>) => {
    setLocations((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
    const loc = locations.find((l) => l.id === id);
    if (!loc) return;
    apiFetch(`/groups/${loc.groupId}/locations/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    }).catch(console.warn);
  }, [locations]);

  const deleteLocation = useCallback(
    (id: string) => {
      const getAllDescendants = (locId: string, locs: Location[]): string[] => {
        const children = locs.filter((l) => l.parentId === locId);
        return [locId, ...children.flatMap((c) => getAllDescendants(c.id, locs))];
      };
      const toDelete = getAllDescendants(id, locations);
      const loc = locations.find((l) => l.id === id);
      setLocations((prev) => prev.filter((l) => !toDelete.includes(l.id)));
      setBins((prev) => prev.filter((b) => !b.locationId || !toDelete.includes(b.locationId)));
      setItems((prev) => {
        const deletedBinIds = bins.filter((b) => b.locationId && toDelete.includes(b.locationId)).map((b) => b.id);
        return prev.filter((i) => !i.binId || !deletedBinIds.includes(i.binId));
      });
      if (loc) {
        apiFetch(`/groups/${loc.groupId}/locations/${id}`, { method: "DELETE" }).catch(
          console.warn,
        );
      }
    },
    [locations, bins],
  );

  // ── Bins ───────────────────────────────────────────────────────────────────

  const getGroupBins = useCallback(
    (groupId?: string) => bins.filter((b) => b.groupId === (groupId ?? activeGroupId)),
    [bins, activeGroupId],
  );

  const getLocationBins = useCallback(
    (locationId: string) => bins.filter((b) => b.locationId === locationId),
    [bins],
  );

  const getUnmappedBins = useCallback(
    () => bins.filter((b) => b.groupId === activeGroupId && b.locationId === null),
    [bins, activeGroupId],
  );

  const addBin = useCallback(
    (name: string, locationId?: string | null, qrCode?: string): Bin => {
      const id = genId();
      const bin: Bin = {
        id,
        groupId: activeGroupRef.current!,
        locationId: locationId ?? null,
        name,
        qrCode,
        createdAt: Date.now(),
      };
      setBins((prev) => [...prev, bin]);
      apiFetch(`/groups/${bin.groupId}/bins`, {
        method: "POST",
        body: JSON.stringify({ id, name, locationId: locationId ?? null, qrCode: qrCode ?? null }),
      })
        .then((data: unknown) => {
          const res = data as { bin: Record<string, unknown> };
          const serverBin = normalizeBin(res.bin);
          setBins((prev) => prev.map((b) => (b.id === id ? serverBin : b)));
        })
        .catch(console.warn);
      return bin;
    },
    [],
  );

  const updateBin = useCallback(
    (id: string, updates: Partial<Bin>) => {
      setBins((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
      const bin = bins.find((b) => b.id === id);
      if (!bin) return;
      apiFetch(`/groups/${bin.groupId}/bins/${id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      }).catch(console.warn);
    },
    [bins],
  );

  const deleteBin = useCallback(
    (id: string) => {
      const bin = bins.find((b) => b.id === id);
      setBins((prev) => prev.filter((b) => b.id !== id));
      setItems((prev) => prev.filter((i) => i.binId !== id));
      if (bin) {
        apiFetch(`/groups/${bin.groupId}/bins/${id}`, { method: "DELETE" }).catch(console.warn);
      }
    },
    [bins],
  );

  const moveBin = useCallback(
    (binId: string, locationId: string) => {
      setBins((prev) => prev.map((b) => (b.id === binId ? { ...b, locationId } : b)));
      const bin = bins.find((b) => b.id === binId);
      if (bin) {
        apiFetch(`/groups/${bin.groupId}/bins/${binId}`, {
          method: "PUT",
          body: JSON.stringify({ locationId }),
        }).catch(console.warn);
      }
    },
    [bins],
  );

  // ── Items ──────────────────────────────────────────────────────────────────

  const getGroupItems = useCallback(
    (groupId?: string) => items.filter((i) => i.groupId === (groupId ?? activeGroupId)),
    [items, activeGroupId],
  );

  const getBinItems = useCallback(
    (binId: string) => items.filter((i) => i.binId === binId),
    [items],
  );

  const getUnmappedItems = useCallback(
    () => items.filter((i) => i.groupId === activeGroupId && i.binId === null),
    [items, activeGroupId],
  );

  const addItem = useCallback(
    (name: string, binId?: string | null, photo?: string, qrCode?: string): Item => {
      const id = genId();
      const now = Date.now();
      const item: Item = {
        id,
        groupId: activeGroupRef.current!,
        binId: binId ?? null,
        name,
        photo,
        qrCode,
        createdAt: now,
        updatedAt: now,
      };
      setItems((prev) => [...prev, item]);
      apiFetch(`/groups/${item.groupId}/items`, {
        method: "POST",
        body: JSON.stringify({ id, name, binId: binId ?? null, photo: photo ?? null, qrCode: qrCode ?? null }),
      })
        .then((data: unknown) => {
          const res = data as { item: Record<string, unknown> };
          const serverItem = normalizeItem(res.item);
          setItems((prev) => prev.map((i) => (i.id === id ? serverItem : i)));
        })
        .catch(console.warn);
      return item;
    },
    [],
  );

  const updateItem = useCallback(
    (id: string, updates: Partial<Item>) => {
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, ...updates, updatedAt: Date.now() } : i)),
      );
      const item = items.find((i) => i.id === id);
      if (!item) return;
      apiFetch(`/groups/${item.groupId}/items/${id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      }).catch(console.warn);
    },
    [items],
  );

  const deleteItem = useCallback(
    (id: string) => {
      const item = items.find((i) => i.id === id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      if (item) {
        apiFetch(`/groups/${item.groupId}/items/${id}`, { method: "DELETE" }).catch(console.warn);
      }
    },
    [items],
  );

  const moveItem = useCallback(
    (itemId: string, binId: string) => {
      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, binId, updatedAt: Date.now() } : i)),
      );
      const item = items.find((i) => i.id === itemId);
      if (item) {
        apiFetch(`/groups/${item.groupId}/items/${itemId}`, {
          method: "PUT",
          body: JSON.stringify({ binId }),
        }).catch(console.warn);
      }
    },
    [items],
  );

  // ── Search / QR ────────────────────────────────────────────────────────────

  const searchItems = useCallback(
    (query: string): SearchResult[] => {
      if (!query.trim() || !activeGroupId) return [];
      const q = query.toLowerCase();
      return items
        .filter((i) => i.groupId === activeGroupId && i.name.toLowerCase().includes(q))
        .map((item) => {
          const bin = item.binId ? bins.find((b) => b.id === item.binId) : undefined;
          const locationPath = bin?.locationId ? getLocationPath(bin.locationId) : [];
          return { item, bin, locationPath };
        });
    },
    [items, bins, activeGroupId, getLocationPath],
  );

  const lookupQR = useCallback(
    (qrCode: string) => {
      if (!activeGroupId) return null;
      const bin = bins.find((b) => b.qrCode === qrCode && b.groupId === activeGroupId);
      if (bin) return { type: "bin" as const, id: bin.id };
      const loc = locations.find((l) => l.qrCode === qrCode && l.groupId === activeGroupId);
      if (loc) return { type: "location" as const, id: loc.id };
      const item = items.find((i) => i.qrCode === qrCode && i.groupId === activeGroupId);
      if (item) return { type: "item" as const, id: item.id };
      return null;
    },
    [bins, locations, items, activeGroupId],
  );

  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? null;

  return (
    <AppContext.Provider
      value={{
        groups,
        activeGroupId,
        activeGroup,
        setActiveGroupId,
        addGroup,
        updateGroup,
        deleteGroup,
        locations,
        getGroupLocations,
        getRootLocations,
        getChildLocations,
        getLocationPath,
        addLocation,
        updateLocation,
        deleteLocation,
        bins,
        getGroupBins,
        getLocationBins,
        getUnmappedBins,
        addBin,
        updateBin,
        deleteBin,
        moveBin,
        items,
        getGroupItems,
        getBinItems,
        getUnmappedItems,
        addItem,
        updateItem,
        deleteItem,
        moveItem,
        searchItems,
        lookupQR,
        isLoading,
        refreshFromCloud,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
