import {useEffect, useRef, useState} from 'react';
import {supabase} from '../lib/supabase';
import {finishAvatarJob, listAvatarJobs, readAvatarJob, validateAvatar, writeAvatarJob, type AvatarJob} from '../lib/storage/avatarUpload';

export function useAvatarUpload(owner: string, expectedKey: string | null, refreshProfile: () => Promise<void>) {
  const currentOwner = useRef(owner); currentOwner.current = owner;
  const alive = useRef(false), busy = useRef(false), selected = useRef<{file: File; operation: string} | null>(null);
  const [uploading, setUploading] = useState(false), [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<AvatarJob[]>([]);
  const [page, setPage] = useState(1);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const active = () => alive.current && currentOwner.current === owner;
  const load = () => { try { const jobs = listAvatarJobs(localStorage, owner); if (active()) setHistory(jobs); } catch { if (active()) setError('Could not read saved uploads. Records have been retained.'); } };
  // This hook is mounted in an owner-keyed settings workspace.
  useEffect(() => { load(); }, [owner]); // eslint-disable-line react-hooks/exhaustive-deps
  const run = async (operation: string, file?: File) => {
    if (busy.current || !active()) return;
    busy.current = true; setUploading(true); setError(null);
    const assertOwner = async () => {
      if (!active()) throw new Error('Account changed. Upload remains with its original account.');
      const session = await supabase.auth.getSession();
      if (session.error || session.data.session?.user.id !== owner || !active()) throw new Error('Sign in to the original account to continue this upload.');
    };
    try {
      await finishAvatarJob(readAvatarJob(localStorage, owner, operation), file, {
        assertOwner,
        save: job => writeAvatarJob(localStorage, job),
        presign: async job => {
          const result = await supabase.functions.invoke('r2-presign', {body: {protocolVersion: 2, ownerId: owner, operationId: job.operation,
            kind: 'coach-image', filename: job.name, contentType: job.type, sizeBytes: job.size}});
          if (result.error || !result.data) throw new Error('Could not prepare avatar upload. Retry this upload.');
          return result.data;
        },
        put: async (url, headers, bytes) => { const response = await fetch(url, {method: 'PUT', headers, body: bytes}); if (!response.ok) throw new Error('Upload response was not confirmed.'); },
        finalize: async (key, ownerId) => {
          const result = await supabase.functions.invoke('r2-finalize', {body: {key, ownerId}});
          if (result.error || result.data?.ready !== true || result.data?.key !== key) throw new Error('Image could not be verified. Retry the same upload.');
        },
        apply: async job => {
          const result = await supabase.rpc('set_verified_avatar', {p_operation_id: job.operation, p_owner_id: owner, p_key: job.key!,
            ...(job.expectedKey === null ? {} : {p_expected_key: job.expectedKey})});
          if (result.error) throw new Error(result.error.message);
          return result.data;
        },
      });
      if (active()) await refreshProfile();
    } catch (cause) { if (active()) setError(cause instanceof Error ? cause.message : 'Avatar upload failed. Retry the same upload.'); }
    finally { busy.current = false; if (active()) { setUploading(false); load(); } }
  };
  const upload = async (file: File) => {
    if (busy.current || !active()) return;
    try {
      validateAvatar(file);
      let operation = selected.current?.file === file ? selected.current.operation : undefined;
      if (!operation) {
        operation = crypto.randomUUID();
        writeAvatarJob(localStorage, {version: 2, owner, operation, name: file.name, type: file.type, size: file.size,
          expectedKey, phase: 'prepared', createdAt: new Date().toISOString()});
        selected.current = {file, operation};
      }
      await run(operation, file);
    } catch (cause) { if (active()) setError(cause instanceof Error ? cause.message : 'Could not retain upload recovery. No upload was started.'); }
  };
  return {avatarUploading: uploading, avatarError: error, uploadAvatar: upload,
    avatarUploads: history.slice(0, page * 10), avatarHasMore: history.length > page * 10,
    loadMoreAvatars: () => setPage(value => value + 1),
    resumeAvatar: (operation: string) => run(operation, selected.current?.operation === operation ? selected.current.file : undefined)};
}
