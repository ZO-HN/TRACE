// Backs the Settings -> Profile tab. Tracks every editable field locally,
// derives per-field "is this dirty" by comparing against the live profile
// row on every render (no cached snapshot to keep in sync), and exposes one
// save function per card so each can be saved independently, plus a
// save-everything-at-once path for when more than one field is dirty.

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { TraceProfile } from './useTraceUser';

export const HEIGHT_OPTIONS = ['152 cm', '160 cm', '168 cm', '175 cm', '182 cm', '190 cm', '198 cm'];
export const BIOLOGICAL_SEX_OPTIONS = ['Prefer not to say', 'Male', 'Female'];
const DEFAULT_HEIGHT_CM = 182;
const AVATAR_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const AVATAR_MAX_BYTES = 10 * 1024 * 1024;

function cmToHeightLabel(cm: number | null): string {
  if (cm == null) return `${DEFAULT_HEIGHT_CM} cm`;
  const label = `${cm} cm`;
  return HEIGHT_OPTIONS.includes(label) ? label : `${DEFAULT_HEIGHT_CM} cm`;
}

function heightLabelToCm(label: string): number {
  return parseInt(label, 10) || DEFAULT_HEIGHT_CM;
}

interface SaveResult {
  error: string | null;
}

export function useProfileForm(profile: TraceProfile, refreshProfile: () => Promise<void>) {
  const [firstName, setFirstName] = useState(profile.first_name ?? '');
  const [lastName, setLastName] = useState(profile.last_name ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [height, setHeight] = useState(cmToHeightLabel(profile.height_cm));
  const [dob, setDob] = useState(profile.dob ?? '');
  const [biologicalSex, setBiologicalSex] = useState(profile.biological_sex ?? 'Prefer not to say');
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [username, setUsername] = useState(profile.username ?? '');

  const [attributesSaving, setAttributesSaving] = useState(false);
  const [attributesError, setAttributesError] = useState<string | null>(null);
  const [personalSaving, setPersonalSaving] = useState(false);
  const [personalError, setPersonalError] = useState<string | null>(null);
  const [sexSaving, setSexSaving] = useState(false);
  const [sexError, setSexError] = useState<string | null>(null);
  const [contactSaving, setContactSaving] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [saveAllSaving, setSaveAllSaving] = useState(false);
  const [saveAllError, setSaveAllError] = useState<string | null>(null);

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const isFirstNameDirty = firstName.trim() !== (profile.first_name ?? '');
  const isLastNameDirty = lastName.trim() !== (profile.last_name ?? '');
  const isBioDirty = bio.trim() !== (profile.bio ?? '');
  const isHeightDirty = heightLabelToCm(height) !== (profile.height_cm ?? DEFAULT_HEIGHT_CM);
  const isDobDirty = dob !== (profile.dob ?? '');
  const isSexDirty = biologicalSex !== (profile.biological_sex ?? 'Prefer not to say');
  const isPhoneDirty = phone.trim() !== (profile.phone ?? '');
  const isUsernameDirty = username.trim() !== (profile.username ?? '');

  const dirtyCount = [
    isFirstNameDirty,
    isLastNameDirty,
    isBioDirty,
    isHeightDirty,
    isDobDirty,
    isSexDirty,
    isPhoneDirty,
    isUsernameDirty,
  ].filter(Boolean).length;

  const isDirty = dirtyCount > 0;
  const showSaveAll = dirtyCount > 1;

  const attributesDirty = isHeightDirty || isDobDirty;
  const personalDirty = isFirstNameDirty || isLastNameDirty || isBioDirty;

  const discard = () => {
    setFirstName(profile.first_name ?? '');
    setLastName(profile.last_name ?? '');
    setBio(profile.bio ?? '');
    setHeight(cmToHeightLabel(profile.height_cm));
    setDob(profile.dob ?? '');
    setBiologicalSex(profile.biological_sex ?? 'Prefer not to say');
    setPhone(profile.phone ?? '');
    setUsername(profile.username ?? '');
    setAttributesError(null);
    setPersonalError(null);
    setSexError(null);
    setContactError(null);
    setUsernameError(null);
    setSaveAllError(null);
  };

  const savePatch = async (patch: Record<string, unknown>): Promise<SaveResult> => {
    const { error } = await supabase.from('profiles').update(patch).eq('id', profile.id);
    if (error) {
      const message = error.message.includes('duplicate') ? 'That username is already taken.' : error.message;
      return { error: message };
    }
    await refreshProfile();
    return { error: null };
  };

  const saveAttributes = async (): Promise<SaveResult> => {
    setAttributesSaving(true);
    setAttributesError(null);
    const result = await savePatch({ height_cm: heightLabelToCm(height), dob: dob || null });
    setAttributesSaving(false);
    if (result.error) setAttributesError(result.error);
    return result;
  };

  const savePersonal = async (): Promise<SaveResult> => {
    setPersonalSaving(true);
    setPersonalError(null);
    const result = await savePatch({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      bio: bio.trim() || null,
    });
    setPersonalSaving(false);
    if (result.error) setPersonalError(result.error);
    return result;
  };

  const saveSex = async (): Promise<SaveResult> => {
    setSexSaving(true);
    setSexError(null);
    const result = await savePatch({ biological_sex: biologicalSex });
    setSexSaving(false);
    if (result.error) setSexError(result.error);
    return result;
  };

  const saveContact = async (): Promise<SaveResult> => {
    setContactSaving(true);
    setContactError(null);
    const result = await savePatch({ phone: phone.trim() || null });
    setContactSaving(false);
    if (result.error) setContactError(result.error);
    return result;
  };

  const saveUsername = async (): Promise<SaveResult> => {
    if (!username.trim()) return { error: null };
    setUsernameSaving(true);
    setUsernameError(null);
    const result = await savePatch({ username: username.trim() });
    setUsernameSaving(false);
    if (result.error) setUsernameError(result.error);
    return result;
  };

  const saveAll = async (): Promise<SaveResult> => {
    setSaveAllSaving(true);
    setSaveAllError(null);
    const result = await savePatch({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      bio: bio.trim() || null,
      height_cm: heightLabelToCm(height),
      dob: dob || null,
      biological_sex: biologicalSex,
      phone: phone.trim() || null,
      username: username.trim() || null,
    });
    setSaveAllSaving(false);
    if (result.error) setSaveAllError(result.error);
    return result;
  };

  const uploadAvatar = async (file: File) => {
    setAvatarError(null);
    if (!AVATAR_CONTENT_TYPES.includes(file.type)) {
      setAvatarError('Avatars must be a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setAvatarError('Avatar must be under 10MB.');
      return;
    }
    setAvatarUploading(true);
    try {
      const { data, error: presignError } = await supabase.functions.invoke<{
        uploadUrl: string;
        key: string;
      }>('r2-presign', {
        body: { kind: 'coach-image', filename: file.name, contentType: file.type, sizeBytes: file.size },
      });
      if (presignError || !data) throw new Error(presignError?.message ?? 'Could not start upload');

      const putResponse = await fetch(data.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!putResponse.ok) throw new Error('Upload to storage failed');

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_key: data.key })
        .eq('id', profile.id);
      if (updateError) throw new Error(updateError.message);

      await refreshProfile();
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Avatar upload failed');
    } finally {
      setAvatarUploading(false);
    }
  };

  return {
    firstName, setFirstName,
    lastName, setLastName,
    bio, setBio,
    height, setHeight,
    dob, setDob,
    biologicalSex, setBiologicalSex,
    phone, setPhone,
    username, setUsername,

    attributesDirty, attributesSaving, attributesError, saveAttributes,
    personalDirty, personalSaving, personalError, savePersonal,
    sexDirty: isSexDirty, sexSaving, sexError, saveSex,
    contactDirty: isPhoneDirty, contactSaving, contactError, saveContact,
    usernameDirty: isUsernameDirty, usernameSaving, usernameError, saveUsername,

    dirtyCount,
    isDirty,
    showSaveAll,
    saveAllSaving,
    saveAllError,
    saveAll,
    discard,

    avatarKey: profile.avatar_key,
    avatarUploading,
    avatarError,
    uploadAvatar,
  };
}

export type ProfileForm = ReturnType<typeof useProfileForm>;
