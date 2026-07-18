import { describe, expect, it } from 'vitest';
import { lbsToKg } from '../../src/lib/units';
import {
  isValidSetInput,
  toSetLogInsert,
  type SetInput,
} from '../../src/lib/outbox/mapSetLog';

const base: SetInput = {
  id: 'set-1',
  sessionId: 'session-1',
  exerciseId: 'exercise-1',
  setNumber: 1,
  weightLbs: '135',
  reps: '10',
  rpe: '7',
};

describe('lbsToKg', () => {
  it('converts and rounds to 2 decimals', () => {
    expect(lbsToKg(135)).toBe(61.23);
    expect(lbsToKg(225)).toBe(102.06);
    expect(lbsToKg(0)).toBe(0);
  });
});

describe('isValidSetInput', () => {
  it('accepts valid numeric input', () => {
    expect(isValidSetInput(base)).toBe(true);
  });

  it('rejects empty or non-numeric weight/reps', () => {
    expect(isValidSetInput({ ...base, weightLbs: '' })).toBe(false);
    expect(isValidSetInput({ ...base, reps: 'abc' })).toBe(false);
    expect(isValidSetInput({ ...base, weightLbs: -5 })).toBe(false);
  });
});

describe('toSetLogInsert', () => {
  it('maps UI input to a kg payload with no estimated_1rm', () => {
    const payload = toSetLogInsert(base);
    expect(payload).toEqual({
      id: 'set-1',
      session_id: 'session-1',
      exercise_id: 'exercise-1',
      set_number: 1,
      weight_kg: 61.23,
      reps: 10,
      rpe: 7,
      is_completed: true,
      form_video_s3_key: null,
    });
    expect('estimated_1rm' in payload).toBe(false);
  });

  it('carries an attached form-clip R2 key', () => {
    expect(
      toSetLogInsert({ ...base, formVideoKey: 'form-video/u1/abc.mp4' })
        .form_video_s3_key,
    ).toBe('form-video/u1/abc.mp4');
  });

  it('treats empty RPE as null', () => {
    expect(toSetLogInsert({ ...base, rpe: '' }).rpe).toBeNull();
    expect(toSetLogInsert({ ...base, rpe: null }).rpe).toBeNull();
  });
});
