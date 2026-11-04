import { describe, expect, it } from 'vitest';
import { onboardingAccountError } from '../../src/lib/onboardingAccount';

describe('onboarding account validation', () => {
  it('accepts a new trainee and a retry for the same coach', () => {
    expect(onboardingAccountError({ role: 'trainee', coach_id: null }, 'a')).toBeNull();
    expect(onboardingAccountError({ role: 'trainee', coach_id: 'a' }, 'a')).toBeNull();
  });
  it('distinguishes a coach session from a different coach relationship', () => {
    expect(onboardingAccountError({ role: 'coach', coach_id: null }, 'a')).toContain('coach account');
    expect(onboardingAccountError({ role: 'trainee', coach_id: 'b' }, 'a')).toContain('different coach');
  });
  it('fails closed when the profile is missing', () => {
    expect(onboardingAccountError(null, 'a')).toContain('Could not load');
  });
});
