// Types for the direct-to-R2 media upload path. See docs/adr/0001-media-storage.md.

export type MediaKind = 'form-video' | 'meal-photo' | 'coach-image' | 'file';

/** What the client asks the edge function to presign. */
export interface PresignRequest {
  kind: MediaKind;
  filename: string;
  contentType: string;
  sizeBytes: number;
}

/** What the edge function returns: a short-lived PUT URL and the object key to persist. */
export interface PresignResponse {
  uploadUrl: string;
  key: string;
  expiresIn: number;
}

/** Result of a completed upload — the key is what gets stored in the DB. */
export interface UploadResult {
  key: string;
  contentType: string;
  sizeBytes: number;
}
