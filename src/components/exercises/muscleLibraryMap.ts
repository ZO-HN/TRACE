import type { Muscle } from 'react-body-highlighter';

// Keyword → library muscle. Order matters: more specific keywords must come
// before generic ones (e.g. "Posterior Delts" before the generic "Delts").
const KEYWORD_MAP: [string, Muscle][] = [
  ['Posterior Delts', 'back-deltoids'],
  ['External Rotators', 'back-deltoids'],
  ['Anterior Delts', 'front-deltoids'],
  ['Delts', 'front-deltoids'],
  ['Trap', 'trapezius'],
  ['Rhomboid', 'upper-back'],
  ['Infraspinatous', 'upper-back'],
  ['Supraspinatous', 'upper-back'],
  ['Subscapularis', 'upper-back'],
  ['Teres', 'upper-back'],
  ['Upper Back', 'upper-back'],
  ['Lat', 'upper-back'],
  ['Erector Spinae', 'lower-back'],
  ['Chest', 'chest'],
  ['Pec', 'chest'],
  ['Serratus Anterior', 'chest'],
  ['Biceps', 'biceps'],
  ['Brachialis', 'biceps'],
  ['Brachioradialis', 'biceps'],
  ['Coracobrachialis', 'biceps'],
  ['Elbow Flexors', 'biceps'],
  ['Triceps', 'triceps'],
  ['Forearms', 'forearm'],
  ['Oblique', 'obliques'],
  ['Abdominus', 'abs'],
  ['Abdominals', 'abs'],
  ['Psoas', 'abs'],
  ['Iliacus', 'abs'],
  ['Adductor', 'adductor'],
  ['Gracilis', 'adductor'],
  ['Abductors (Hip)', 'abductors'],
  ['TFL', 'abductors'],
  ['Hamstrings', 'hamstring'],
  ['Biceps Femoris', 'hamstring'],
  ['Semimembrinosus', 'hamstring'],
  ['Semitendinosus', 'hamstring'],
  ['Quadriceps', 'quadriceps'],
  ['Rectus Femoris', 'quadriceps'],
  ['Vastus', 'quadriceps'],
  ['Sartorius', 'quadriceps'],
  ['VMO', 'quadriceps'],
  ['Calves', 'calves'],
  ['Gastrocnemius', 'calves'],
  ['Soleus', 'calves'],
  ['Lower Leg', 'calves'],
  ['Tibialis Anterior', 'calves'],
  ['Glute', 'gluteal'],
];

export function libraryMuscleForName(name: string): Muscle | null {
  const lower = name.toLowerCase();
  for (const [keyword, muscle] of KEYWORD_MAP) {
    if (lower.includes(keyword.toLowerCase())) return muscle;
  }
  return null;
}

// Best single representative muscle_groups.name for each library region —
// used so clicking a body region on the model toggles one concrete,
// specific taxonomy entry (several of the 65 rows share one visual region;
// this picks the most generic/top-level one per region for the click target).
export const CANONICAL_NAME_BY_LIBRARY_MUSCLE: Partial<Record<Muscle, string>> = {
  chest: 'Chest',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearm: 'Forearms',
  abs: 'Abdominals',
  obliques: 'External Oblique (Trunk & Core)',
  quadriceps: 'Quadriceps',
  hamstring: 'Hamstrings',
  calves: 'Calves',
  gluteal: 'Glutes',
  'front-deltoids': 'Anterior Delts (Delts)',
  'back-deltoids': 'Posterior Delts (Delts)',
  adductor: 'Adductors (Hip)',
  abductors: 'Abductors (Hip)',
  'upper-back': 'Upper Back',
  'lower-back': 'Erector Spinae (Trunk & Core)',
  trapezius: 'Trap 1 Upper Trapezius (Upper Back)',
};
