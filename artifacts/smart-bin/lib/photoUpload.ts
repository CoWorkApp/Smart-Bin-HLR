import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import * as SecureStore from "expo-secure-store";

const AUTH_TOKEN_KEY = "auth_session_token";

function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_DOMAIN) {
    return `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
  }
  return "";
}

async function getAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

async function uriToBase64(uri: string): Promise<{ base64: string; mimeType: string }> {
  const mimeType = uri.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";

  if (Platform.OS === "web") {
    const response = await fetch(uri);
    const blob = await response.blob();
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return { base64, mimeType };
  }

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return { base64, mimeType };
}

export async function uploadPhoto(uri: string): Promise<string> {
  const { base64, mimeType } = await uriToBase64(uri);

  const token = await getAuthToken();
  const apiBase = getApiBaseUrl();

  const res = await fetch(`${apiBase}/api/photos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ data: base64, mimeType }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Photo upload failed: ${res.status} ${body}`);
  }

  const { id } = await res.json();
  return `${apiBase}/api/photos/${id}`;
}

export function resolvePhotoUri(photo: string | undefined | null): string | undefined {
  if (!photo) return undefined;
  if (
    photo.startsWith("http://") ||
    photo.startsWith("https://") ||
    photo.startsWith("file://") ||
    photo.startsWith("content://")
  ) {
    return photo;
  }
  return `${getApiBaseUrl()}${photo}`;
}
