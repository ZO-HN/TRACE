export const CATEGORIES = ['Chest', 'Arms', 'Back', 'Legs', 'Shoulders', 'Core'] as const;

export const EXERCISE_TYPES = [
  { value: 'regular', label: 'Regular' },
  { value: 'isometric_yielding', label: 'Isometric Yielding' },
  { value: 'isometric_overcoming', label: 'Isometric Overcoming' },
] as const;

export const MOVEMENT_PROFILES = [
  'Descending',
  'Eccentric Overload',
  'Flat',
  'Lengthened',
  'Matches Strength Curve',
  'Mid-Lengthened',
  'Mid-Short',
  'Middle',
  'Short',
  'Variable By Cable Angle',
  'Variable By Setup',
  'Variable By Resistance',
  'Variable By Torque',
] as const;

export const POSITIONS = ['Shortened', 'Mid-Shortened', 'Mid-Range', 'Mid-Lengthened', 'Lengthened', 'Full-Range'] as const;

export const EQUIPMENT_OPTIONS = [
  'None',
  'Single Adjustable Cable',
  'Dual Adjustable Cables',
  'Smith Machine',
  'Adjustable Bench',
  'Flat Bench',
  'Barbell',
  'Dumbbell',
  'Dumbbells',
  'Kettlebell',
  'Upper Body Machine',
  'Lower Body Machine',
  'Resistance Band',
  'Pull-Up Bar',
  'Medicine Ball',
] as const;

export const EQUIPMENT_QUICK_GROUPS: Record<string, string[]> = {
  'Free Weights': ['Barbell', 'Dumbbell', 'Dumbbells', 'Kettlebell'],
  Machines: ['Upper Body Machine', 'Lower Body Machine', 'Smith Machine'],
  'Bodyweight Only': ['None'],
};
