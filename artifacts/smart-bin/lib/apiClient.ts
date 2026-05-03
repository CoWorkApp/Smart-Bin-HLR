import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "auth_session_token";

export function getApiBase(): string {
  if (process.env.EXPO_PUBLIC_DOMAIN) {
    return `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
  }
  return "";
}

export async function getAuthHeaders(): Promise<HeadersInit> {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  } catch {
    // SecureStore unavailable (web / simulator without native modules)
  }
  return { "Content-Type": "application/json" };
}

export async function apiFetch<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBase()}/api${path}`, {
    ...options,
    headers: { ...headers, ...(options?.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${path}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export function genId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}
