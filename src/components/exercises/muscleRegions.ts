export interface MuscleRegion {
  key: string;
  label: string;
  side: 'front' | 'back';
  shape: 'rect' | 'ellipse';
  // rect: x,y,width,height,rx  |  ellipse: cx,cy,rx,ry
  x: number;
  y: number;
  w: number;
  h: number;
  rx: number;
  keywords: string[];
}

// Simplified body-map regions. Approximate, not anatomically precise — several
// of the 65 taxonomy entries (see muscle_groups seed) share one visual region.
export const MUSCLE_REGIONS: MuscleRegion[] = [
  // ---- front ----
  { key: 'anterior-delts', label: 'Anterior Delts', side: 'front', shape: 'ellipse', x: 62, y: 66, w: 14, h: 18, rx: 0, keywords: ['Anterior Delts', 'Delts'] },
  { key: 'anterior-delts-r', label: 'Anterior Delts', side: 'front', shape: 'ellipse', x: 138, y: 66, w: 14, h: 18, rx: 0, keywords: ['Anterior Delts', 'Delts'] },
  { key: 'chest', label: 'Chest', side: 'front', shape: 'rect', x: 76, y: 72, w: 48, h: 34, rx: 8, keywords: ['Chest', 'Pec'] },
  { key: 'serratus', label: 'Serratus Anterior', side: 'front', shape: 'rect', x: 76, y: 106, w: 12, h: 20, rx: 4, keywords: ['Serratus Anterior'] },
  { key: 'abs', label: 'Abs', side: 'front', shape: 'rect', x: 88, y: 108, w: 24, h: 52, rx: 6, keywords: ['Abdominus', 'Abdominals', 'Oblique', 'Trunk & Core'] },
  { key: 'hip-flexors', label: 'Hip Flexors', side: 'front', shape: 'rect', x: 84, y: 160, w: 32, h: 14, rx: 6, keywords: ['Psoas', 'Iliacus'] },
  { key: 'biceps-l', label: 'Biceps', side: 'front', shape: 'ellipse', x: 55, y: 100, w: 9, h: 20, rx: 0, keywords: ['Biceps', 'Brachialis', 'Brachioradialis', 'Coracobrachialis', 'Elbow Flexors'] },
  { key: 'biceps-r', label: 'Biceps', side: 'front', shape: 'ellipse', x: 145, y: 100, w: 9, h: 20, rx: 0, keywords: ['Biceps', 'Brachialis', 'Brachioradialis', 'Coracobrachialis', 'Elbow Flexors'] },
  { key: 'forearms-l', label: 'Forearms', side: 'front', shape: 'rect', x: 47, y: 124, w: 12, h: 26, rx: 5, keywords: ['Forearms'] },
  { key: 'forearms-r', label: 'Forearms', side: 'front', shape: 'rect', x: 141, y: 124, w: 12, h: 26, rx: 5, keywords: ['Forearms'] },
  { key: 'adductors', label: 'Adductors', side: 'front', shape: 'rect', x: 95, y: 176, w: 10, h: 40, rx: 4, keywords: ['Adductor', 'Adductors', 'Gracilis'] },
  { key: 'quads-l', label: 'Quadriceps', side: 'front', shape: 'rect', x: 78, y: 176, w: 16, h: 56, rx: 6, keywords: ['Quadriceps', 'Rectus Femoris', 'Vastus', 'Sartorius', 'VMO'] },
  { key: 'quads-r', label: 'Quadriceps', side: 'front', shape: 'rect', x: 106, y: 176, w: 16, h: 56, rx: 6, keywords: ['Quadriceps', 'Rectus Femoris', 'Vastus', 'Sartorius', 'VMO'] },
  { key: 'abductors-l', label: 'Abductors (Hip)', side: 'front', shape: 'ellipse', x: 74, y: 178, w: 6, h: 16, rx: 0, keywords: ['Abductors (Hip)', 'TFL'] },
  { key: 'abductors-r', label: 'Abductors (Hip)', side: 'front', shape: 'ellipse', x: 126, y: 178, w: 6, h: 16, rx: 0, keywords: ['Abductors (Hip)', 'TFL'] },
  { key: 'tibialis-l', label: 'Tibialis Anterior', side: 'front', shape: 'rect', x: 80, y: 236, w: 12, h: 42, rx: 5, keywords: ['Tibialis Anterior'] },
  { key: 'tibialis-r', label: 'Tibialis Anterior', side: 'front', shape: 'rect', x: 108, y: 236, w: 12, h: 42, rx: 5, keywords: ['Tibialis Anterior'] },

  // ---- back ----
  { key: 'upper-back', label: 'Upper Back / Traps', side: 'back', shape: 'rect', x: 78, y: 62, w: 44, h: 30, rx: 6, keywords: ['Trap', 'Rhomboid', 'Infraspinatous', 'Supraspinatous', 'Subscapularis', 'Teres', 'Upper Back'] },
  { key: 'posterior-delts-l', label: 'Posterior Delts', side: 'back', shape: 'ellipse', x: 62, y: 66, w: 14, h: 18, rx: 0, keywords: ['Posterior Delts', 'Delts', 'External Rotators'] },
  { key: 'posterior-delts-r', label: 'Posterior Delts', side: 'back', shape: 'ellipse', x: 138, y: 66, w: 14, h: 18, rx: 0, keywords: ['Posterior Delts', 'Delts', 'External Rotators'] },
  { key: 'lats', label: 'Lats', side: 'back', shape: 'rect', x: 74, y: 92, w: 52, h: 34, rx: 10, keywords: ['Lat'] },
  { key: 'erector-spinae', label: 'Erector Spinae', side: 'back', shape: 'rect', x: 92, y: 126, w: 16, h: 40, rx: 5, keywords: ['Erector Spinae'] },
  { key: 'triceps-l', label: 'Triceps', side: 'back', shape: 'ellipse', x: 55, y: 100, w: 9, h: 20, rx: 0, keywords: ['Triceps'] },
  { key: 'triceps-r', label: 'Triceps', side: 'back', shape: 'ellipse', x: 145, y: 100, w: 9, h: 20, rx: 0, keywords: ['Triceps'] },
  { key: 'forearms-back-l', label: 'Forearms', side: 'back', shape: 'rect', x: 47, y: 124, w: 12, h: 26, rx: 5, keywords: ['Forearms'] },
  { key: 'forearms-back-r', label: 'Forearms', side: 'back', shape: 'rect', x: 141, y: 124, w: 12, h: 26, rx: 5, keywords: ['Forearms'] },
  { key: 'glutes', label: 'Glutes', side: 'back', shape: 'rect', x: 80, y: 168, w: 40, h: 22, rx: 10, keywords: ['Glute'] },
  { key: 'hamstrings-l', label: 'Hamstrings', side: 'back', shape: 'rect', x: 78, y: 192, w: 16, h: 44, rx: 6, keywords: ['Hamstrings', 'Biceps Femoris', 'Semimembrinosus', 'Semitendinosus'] },
  { key: 'hamstrings-r', label: 'Hamstrings', side: 'back', shape: 'rect', x: 106, y: 192, w: 16, h: 44, rx: 6, keywords: ['Hamstrings', 'Biceps Femoris', 'Semimembrinosus', 'Semitendinosus'] },
  { key: 'calves-l', label: 'Calves', side: 'back', shape: 'ellipse', x: 86, y: 258, w: 8, h: 20, rx: 0, keywords: ['Calves', 'Gastrocnemius', 'Soleus', 'Lower Leg'] },
  { key: 'calves-r', label: 'Calves', side: 'back', shape: 'ellipse', x: 114, y: 258, w: 8, h: 20, rx: 0, keywords: ['Calves', 'Gastrocnemius', 'Soleus', 'Lower Leg'] },
];

export function regionsForMuscleName(name: string): MuscleRegion[] {
  const lower = name.toLowerCase();
  return MUSCLE_REGIONS.filter((r) => r.keywords.some((k) => lower.includes(k.toLowerCase())));
}
