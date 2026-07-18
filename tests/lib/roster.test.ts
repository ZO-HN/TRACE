import { describe, expect, it } from 'vitest';
import { fullName, readinessBand } from '../../src/lib/roster/display';

describe('readinessBand', () => {
  it('bands scores into ready / moderate / low', () => {
    expect(readinessBand(85)).toBe('ready');
    expect(readinessBand(70)).toBe('ready');
    expect(readinessBand(55)).toBe('moderate');
    expect(readinessBand(40)).toBe('moderate');
    expect(readinessBand(20)).toBe('low');
  });

  it('treats missing data as unknown', () => {
    expect(readinessBand(null)).toBe('unknown');
    expect(readinessBand(undefined)).toBe('unknown');
    expect(readinessBand(Number.NaN)).toBe('unknown');
  });
});

describe('fullName', () => {
  it('joins and trims', () => {
    expect(fullName({ first_name: 'Ada', last_name: 'Lovelace' })).toBe('Ada Lovelace');
    expect(fullName({ first_name: 'Cher', last_name: '' })).toBe('Cher');
  });
});
