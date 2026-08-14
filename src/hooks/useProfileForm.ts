// Backs the Settings -> Profile tab. Tracks every editable field locally,
// derives "is this dirty" by comparing against the live profile row on every
// render (no cached snapshot to keep in sync), and saves everything in one
// write so a single floating "Save all changes" action covers every card.

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { TraceProfile } from './useTraceUser';

export const HEIGHT_OPTIONS = ['152 cm', '160 cm', '168 cm', '175 cm', '182 cm', '190 cm', '198 cm'];
export const BIOLOGICAL_SEX_OPTIONS = ['Prefer not to say', 'Male', 'Female'];
const DEFAULT_HEIGHT_CM = 182;

function cmToHeightLabel(cm: number | null): string {
  if (cm == null) return `${DEFAULT_HEIGHT_CM} cm`;
  const label = `${cm} cm`;
  return HEIGHT_OPTIONS.includes(label) ? label : `${DEFAULT_HEIGHT_CM} cm`;
}

function heightLabelToCm(label: string): number {
  return parseInt(label, 10) || DEFAULT_HEIGHT_CM;
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty =
    firstName.trim() !== (profile.first_name ?? '') ||
    lastName.trim() !== (profile.last_name ?? '') ||
    bio.trim() !== (profile.bio ?? '') ||
    heightLabelToCm(height) !== (profile.height_cm ?? DEFAULT_HEIGHT_CM) ||
    dob !== (profile.dob ?? '') ||
    biologicalSex !== (profile.biological_sex ?? 'Prefer not to say') ||
    phone.trim() !== (profile.phone ?? '') ||
    username.trim() !== (profile.username ?? '');

  const discard = () => {
    setFirstName(profile.first_name ?? '');
    setLastName(profile.last_name ?? '');
    setBio(profile.bio ?? '');
    setHeight(cmToHeightLabel(profile.height_cm));
    setDob(profile.dob ?? '');
    setBiologicalSex(profile.biological_sex ?? 'Prefer not to say');
    setPhone(profile.phone ?? '');
    setUsername(profile.username ?? '');
    setError(null);
  };

  const saveAll = async (): Promise<{ error: string | null }> => {
    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        bio: bio.trim() || null,
        height_cm: heightLabelToCm(height),
        dob: dob || null,
        biological_sex: biologicalSex,
        phone: phone.trim() || null,
        username: username.trim() || null,
      })
      .eq('id', profile.id);
    setSaving(false);
    if (updateError) {
      const message = updateError.message.includes('duplicate')
        ? 'That username is already taken.'
        : updateError.message;
      setError(message);
      return { error: message };
    }
    await refreshProfile();
    return { error: null };
  };

  const handleAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAvatarUrl(URL.createObjectURL(file));
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
    avatarUrl, handleAvatarPick,
    isDirty,
    saving,
    error,
    saveAll,
    discard,
  };
}

export type ProfileForm = ReturnType<typeof useProfileForm>;
