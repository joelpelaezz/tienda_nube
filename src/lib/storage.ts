export type StorageProvider = 'local' | 'r2' | 'uploadthing';

export interface UploadResult {
  url: string;
  key: string;
}

export async function uploadFile(
  file: File,
  productId: number
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('productId', String(productId));

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(error.error || 'Upload failed');
  }

  return res.json();
}

export function getImageUrl(url: string): string {
  if (url.startsWith('http')) return url;
  return url;
}
