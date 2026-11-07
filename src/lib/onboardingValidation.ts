import type { StepDef } from '../config/onboardingScreens';

export function hasOnboardingAnswer(key: string, def: StepDef, value: unknown): boolean {
  const filled = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0 && v !== '__other__';
  if (key === 'current-goal') return Array.isArray(value) && value.length >= 1 && value.length <= 3 && value.every(v => def.options?.includes(v));
  if (def.kind === 'tag-input' || def.kind === 'photo') return Array.isArray(value) && value.length > 0 && value.every(filled);
  if (def.kind === 'dob') {
    if (!value || typeof value !== 'object') return false;
    const { month, day, year } = value as Record<string, unknown>;
    if (![month, day, year].every(filled)) return false;
    const date = new Date(`${month} ${day}, ${year}`);
    return Number.isFinite(date.getTime()) && date.getDate() === Number(day) && date.getFullYear() === Number(year) && date < new Date();
  }
  if (def.kind === 'macros') {
    if (!value || typeof value !== 'object') return false;
    return ['protein', 'carbs', 'fat'].every(k => {
      const v = (value as Record<string, unknown>)[k];
      return filled(v) && /^\d+(\.\d+)?$/.test(v.trim()) && Number.isFinite(Number(v)) && Number(v) >= 0;
    });
  }
  if (!filled(value)) return false;
  if (def.kind === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  if (def.kind === 'height') return /^\d+'([0-9]|1[01])$/.test(value) || (Number(value) >= 100 && Number(value) <= 250);
  if (def.kind === 'weight') return /^\d+(\.\d+)?$/.test(value.trim()) && Number.isFinite(Number(value)) && Number(value) > 0;
  return true;
}
