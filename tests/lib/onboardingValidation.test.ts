import { expect, it } from 'vitest';
import { STEP_DEFS } from '../../src/config/onboardingScreens';
import { hasOnboardingAnswer } from '../../src/lib/onboardingValidation';

it('blocks empty answers for every enabled question type', () => {
  for (const [key, def] of Object.entries(STEP_DEFS)) {
    for (const value of [undefined, '', '   ', [], {}]) expect(hasOnboardingAnswer(key, def, value)).toBe(false);
  }
});
it('requires a selection and rejects the unfinished Other placeholder', () => {
  expect(hasOnboardingAnswer('current-goal', STEP_DEFS['current-goal'], ['Build muscle'])).toBe(true);
  expect(hasOnboardingAnswer('current-training-split', STEP_DEFS['current-training-split'], '__other__')).toBe(false);
});
it('validates email, date and complete numeric macros', () => {
  expect(hasOnboardingAnswer('email', STEP_DEFS.email, 'invalid')).toBe(false);
  expect(hasOnboardingAnswer('email', STEP_DEFS.email, 'client@example.com')).toBe(true);
  expect(hasOnboardingAnswer('dob', STEP_DEFS.dob, { month: 'February', day: '31', year: '2000' })).toBe(false);
  expect(hasOnboardingAnswer('daily-macros', STEP_DEFS['daily-macros'], { protein: '100', carbs: '', fat: '50' })).toBe(false);
  expect(hasOnboardingAnswer('daily-macros', STEP_DEFS['daily-macros'], { protein: '100', carbs: '200', fat: '50' })).toBe(true);
});
