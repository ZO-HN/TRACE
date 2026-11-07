// Metadata only: file bytes stay in the selected File/R2, never localStorage.
export interface AvatarJob {
  version: 2; owner: string; operation: string; name: string; type: string; size: number;
  expectedKey: string | null; key?: string; phase: 'prepared' | 'issued' | 'ready' | 'applied'; createdAt: string;
}
const prefix = 'trace:avatar-upload:v2:';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validateAvatar(file: Pick<File, 'name' | 'type' | 'size'>) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Avatars must be a JPEG, PNG, or WebP image.');
  if (!Number.isSafeInteger(file.size) || file.size < 1 || file.size > 10 * 1024 * 1024) throw new Error('Choose an image between 1 byte and 10MB.');
  if (!file.name || file.name.length > 255) throw new Error('Choose an image with a filename under 256 characters.');
}
export function avatarJobKey(job: Pick<AvatarJob, 'owner' | 'operation'>) { return `${prefix}${job.owner}:${job.operation}`; }
export function readAvatarJob(storage: Storage, owner: string, operation: string): AvatarJob {
  const raw = storage.getItem(avatarJobKey({owner, operation}));
  if (!raw) throw new Error('Upload recovery record is unavailable.');
  const job: AvatarJob = JSON.parse(raw);
  if (job?.version !== 2 || job.owner !== owner || job.operation !== operation || !uuid.test(owner) || !uuid.test(operation)
      || !['prepared', 'issued', 'ready', 'applied'].includes(job.phase) || (job.expectedKey !== null && typeof job.expectedKey !== 'string')
      || typeof job.createdAt !== 'string' || (job.key !== undefined && job.key !== `coach-image/${owner}/${operation}`)) throw new Error('Upload recovery record is invalid; it has been retained.');
  validateAvatar(job);
  if (job.phase !== 'prepared' && !job.key) throw new Error('Upload recovery key is missing; record retained.');
  return job;
}
export function listAvatarJobs(storage: Storage, owner: string): AvatarJob[] {
  const keys = Array.from({length: storage.length}, (_, i) => storage.key(i)).filter((key): key is string => !!key && key.startsWith(`${prefix}${owner}:`));
  return keys.map(key => readAvatarJob(storage, owner, key.slice(key.lastIndexOf(':') + 1)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function writeAvatarJob(storage: Storage, job: AvatarJob) { storage.setItem(avatarJobKey(job), JSON.stringify(job)); }
export interface AvatarTransport {
  assertOwner: () => Promise<void>;
  presign: (job: AvatarJob) => Promise<{protocolVersion: number; key: string; uploadUrl: string; uploadHeaders: Record<string, string>}>;
  put: (url: string, headers: Record<string, string>, file: File) => Promise<void>;
  finalize: (key: string, owner: string) => Promise<void>;
  apply: (job: AvatarJob) => Promise<string>;
  save: (job: AvatarJob) => void;
}
export async function finishAvatarJob(original: AvatarJob, file: File | undefined, api: AvatarTransport): Promise<AvatarJob> {
  let job = {...original};
  await api.assertOwner();
  if (job.phase === 'applied') return job;
  let verified = false;
  if (job.key) {
    try { await api.finalize(job.key, job.owner); verified = true; }
    catch (cause) { if (!file) throw cause; }
    await api.assertOwner();
  }
  if (!verified) {
    if (!file) throw new Error('The original image is still needed. Retry from the open upload, or choose the image again. The old recovery record is retained.');
    validateAvatar(file);
    if (file.name !== job.name || file.type !== job.type || file.size !== job.size) throw new Error('This upload belongs to a different selected image.');
    const signed = await api.presign(job);
    await api.assertOwner();
    const key = `coach-image/${job.owner}/${job.operation}`;
    if (signed.protocolVersion !== 2 || signed.key !== key || !signed.uploadUrl.startsWith('https://')
        || signed.uploadHeaders?.['Content-Type'] !== job.type || signed.uploadHeaders?.['If-None-Match'] !== '*'
        || Object.keys(signed.uploadHeaders).length !== 2) throw new Error('Invalid upload response. No image was sent.');
    job = {...job, key, phase: 'issued'}; api.save(job);
    await api.assertOwner();
    // Lost PUT responses and write-once 412s recover by checking the same object.
    try { await api.put(signed.uploadUrl, signed.uploadHeaders, file); } catch { /* finalize establishes success */ }
    await api.assertOwner();
    await api.finalize(key, job.owner);
    await api.assertOwner();
  }
  job = {...job, phase: 'ready'}; api.save(job);
  await api.assertOwner();
  const receipt = await api.apply(job);
  await api.assertOwner();
  if (receipt !== job.owner) throw new Error('Avatar confirmation was incomplete. Retry this same upload.');
  job = {...job, phase: 'applied'}; api.save(job);
  return job;
}
