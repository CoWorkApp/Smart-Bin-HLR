import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import * as SecureStore from "expo-secure-store";

const AUTH_TOKEN_KEY = "auth_session_token";

const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 0.75;
const MAX_UPLOAD_BYTES = 1.5 * 1024 * 1024;

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

async function compressNative(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_DIMENSION, height: MAX_DIMENSION } }],
    {
      compress: JPEG_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: false,
    },
  );
  return result.uri;
}

async function compressWeb(uri: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas unavailable")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = uri;
  });
}

async function toBase64(uri: string): Promise<{ base64: string; mimeType: string }> {
  if (Platform.OS === "web") {
    const dataUrl = await compressWeb(uri);
    return { base64: dataUrl.split(",")[1], mimeType: "image/jpeg" };
  }

  const compressedUri = await compressNative(uri);
  const base64 = await FileSystem.readAsStringAsync(compressedUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return { base64, mimeType: "image/jpeg" };
}

export async function uploadPhoto(uri: string): Promise<string> {
  const { base64, mimeType } = await toBase64(uri);

  const estimatedBytes = Math.round((base64.length * 3) / 4);
  if (estimatedBytes > MAX_UPLOAD_BYTES) {
    throw new Error(
      `Photo is too large (${(estimatedBytes / 1024 / 1024).toFixed(1)} MB). Maximum is 1.5 MB after compression.`,
    );
  }

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
