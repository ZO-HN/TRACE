import { describe, expect, it } from 'vitest';
import { roomNameFor } from '../../src/lib/call/room';

describe('roomNameFor', () => {
  it('is deterministic — coach and trainee derive the same room', () => {
    const coachId = '123e4567-e89b-12d3-a456-426614174000';
    expect(roomNameFor(coachId)).toBe(roomNameFor(coachId));
  });

  it('strips non-alphanumerics for a Jitsi-safe name', () => {
    expect(roomNameFor('123e4567-e89b-12d3-a456-426614174000')).toBe(
      'trace-call-123e4567e89b12d3a456426614174000',
    );
  });
});
