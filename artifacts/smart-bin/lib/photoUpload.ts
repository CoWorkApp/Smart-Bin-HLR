import { getApiBase, getAuthHeaders } from "./apiClient";

/**
 * Upload a local photo URI to cloud object storage.
 * Returns the objectPath (e.g. "/objects/uploads/some-uuid") to store in the DB.
 */
export async function uploadPhoto(localUri: string): Promise<string> {
  const filename = localUri.split("/").pop() ?? "photo.jpg";
  const contentType = filename.endsWith(".png") ? "image/png" : "image/jpeg";

  const fileInfo = await fetch(localUri);
  const blob = await fileInfo.blob();
  const size = blob.size;

  const headers = await getAuthHeaders();
  const urlRes = await fetch(`${getApiBase()}/api/storage/uploads/request-url`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name: filename, size, contentType }),
  });
  if (!urlRes.ok) {
    throw new Error(`Failed to get upload URL: ${urlRes.status}`);
  }
  const { uploadURL, objectPath } = (await urlRes.json()) as {
    uploadURL: string;
    objectPath: string;
  };

  const uploadRes = await fetch(uploadURL, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });
  if (!uploadRes.ok) {
    throw new Error(`Failed to upload photo: ${uploadRes.status}`);
  }

  return objectPath;
}

/**
 * Convert a stored photo value to a displayable URI.
 * - Cloud path like "/objects/..." → full API URL
 * - Local file:// URI (legacy) → returned as-is
 * - undefined → undefined
 */
export function resolvePhotoUri(photo: string | undefined): string | undefined {
  if (!photo) return undefined;
  if (photo.startsWith("/objects/")) {
    return `${getApiBase()}/api/storage${photo}`;
  }
  return photo;
}
