export function onboardingAccountError(
  profile: { role: string; coach_id: string | null } | null,
  coachId: string,
): string | null {
  if (!profile) return 'Could not load your account. Please sign in again and retry.';
  if (profile.role !== 'trainee') return 'You are signed in with a coach account. Sign out and use the new client’s account to complete onboarding.';
  if (profile.coach_id && profile.coach_id !== coachId) return 'You are already linked to a different coach. Contact them before switching.';
  return null;
}
