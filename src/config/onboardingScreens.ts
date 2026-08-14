// Shared between the coach-side "Client onboarding screens" settings tab and
// the public /onboarding wizard the trainee fills out via an invite link.
// There's no backend table for this yet, so the coach's enabled/ordered
// screen list travels as a base64 "config" query param on the invite link
// (see buildInviteLink / parseInviteConfig below) rather than a live fetch.

export type StepKind =
  | 'text'
  | 'email'
  | 'dob'
  | 'height'
  | 'weight'
  | 'single-choice'
  | 'tag-input'
  | 'macros'
  | 'photo';

export interface OnboardingScreen {
  key: string;
  label: string;
  required?: boolean;
  enabled: boolean;
}

export interface StepDef {
  kind: StepKind;
  title: string;
  subtitle: string;
  footerText: string;
  placeholder?: string;
  options?: string[];
  allowOther?: boolean;
  suggestions?: string[];
  exclusiveOption?: string;
  note?: string;
  category: 'personal' | 'training' | 'nutrition';
}

export const DEFAULT_ONBOARDING_SCREENS: OnboardingScreen[] = [
  { key: 'name', label: 'Full Name', required: true, enabled: true },
  { key: 'email', label: 'Email Address', required: true, enabled: true },
  { key: 'dob', label: 'Date of Birth', enabled: true },
  { key: 'height', label: 'Height', enabled: true },
  { key: 'weight', label: 'Weight', enabled: true },
  { key: 'current-goal', label: 'Current Goal', enabled: true },
  { key: 'current-workouts', label: 'Current Workouts', enabled: false },
  { key: 'current-training-split', label: 'Training Split', enabled: false },
  { key: 'exercise-selection', label: 'Exercise Selection', enabled: false },
  { key: 'equipment-list-gym', label: 'Equipment List', enabled: false },
  { key: 'injuries', label: 'Injuries', enabled: false },
  { key: 'avg-cardio-per-week', label: 'Average Cardio Per Week', enabled: false },
  { key: 'avg-steps-per-day', label: 'Average Steps Per Day', enabled: false },
  { key: 'food-preferences', label: 'Food Preferences', enabled: false },
  { key: 'allergies', label: 'Allergies', enabled: false },
  { key: 'daily-calories', label: 'Daily Calories', enabled: false },
  { key: 'daily-macros', label: 'Daily Macros', enabled: false },
  { key: 'avg-number-meals-per-day', label: 'Average Meals Per Day', enabled: false },
  { key: 'meals-you-usually-eat', label: 'Meals You Usually Eat', enabled: false },
  { key: 'num-meals-before-gym', label: 'Meals Before Gym', enabled: false },
  { key: 'pre-workout-meal', label: 'Pre-Workout Meal', enabled: false },
  { key: 'recent-physique-shots', label: 'Recent Physique Photos', enabled: false },
];

export const STEP_DEFS: Record<string, StepDef> = {
  name: {
    category: 'personal',
    kind: 'text',
    title: "What's your full name?",
    subtitle: 'This helps your coach personalize your training experience.',
    footerText: 'Your coach will use this to address you personally.',
    placeholder: 'Enter your full name',
  },
  email: {
    category: 'personal',
    kind: 'email',
    title: "What's your email address?",
    subtitle: 'This is optional but helps your coach stay in touch.',
    footerText: 'Your coach can use this to contact you outside TRACE.',
  },
  dob: {
    category: 'personal',
    kind: 'dob',
    title: "When's your birthday?",
    subtitle: 'Your age helps us create the most effective training plan for you.',
    footerText: 'Age can affect training volume, recovery, and nutrition needs.',
  },
  height: {
    category: 'personal',
    kind: 'height',
    title: 'How tall are you?',
    subtitle: 'Height helps us estimate your training and nutrition targets.',
    footerText: 'Use whichever unit is most familiar to you.',
  },
  weight: {
    category: 'personal',
    kind: 'weight',
    title: "What's your current weight?",
    subtitle: 'Your weight helps your coach personalize nutrition and progress tracking.',
    footerText: 'This can be approximate. You can update it later.',
  },
  'current-goal': {
    category: 'training',
    kind: 'single-choice',
    title: "What's your current fitness goal?",
    subtitle: 'Choose the primary goal you want to focus on with your coach.',
    footerText: 'Your goal helps us design the most effective training program for you.',
    options: [
      'Build muscle',
      'Lose weight',
      'Improve strength',
      'Increase endurance',
      'General fitness',
      'Sport-specific training',
      'Rehabilitation',
    ],
    allowOther: true,
  },
  'current-workouts': {
    category: 'training',
    kind: 'tag-input',
    title: 'What workouts are you currently doing?',
    subtitle: 'Tell us about your current routine so your coach can build from it.',
    footerText: 'Include days, exercises, or anything you already follow.',
    placeholder: 'e.g. Push/pull/legs, CrossFit, running program',
    exclusiveOption: "I don't currently train",
  },
  'current-training-split': {
    category: 'training',
    kind: 'single-choice',
    title: "What's your current training split?",
    subtitle: 'Choose the training split that best describes how you organize your workouts.',
    footerText: 'Your training split helps us understand your workout structure and recovery needs.',
    options: [
      'Push/Pull/Legs',
      'Upper/Lower Split',
      'Full Body',
      'Body Part Split (Bro Split)',
      '5/3/1',
      'Starting Strength',
      'StrongLifts 5x5',
      'No specific split',
    ],
    allowOther: true,
  },
  'exercise-selection': {
    category: 'training',
    kind: 'tag-input',
    title: 'Which exercises do you prefer?',
    subtitle: 'Tell us about specific exercises you enjoy or want to include in your training.',
    footerText: 'Your coach can use these preferences when building your program.',
    placeholder: 'e.g. Squats, deadlifts, pull-ups',
  },
  'equipment-list-gym': {
    category: 'training',
    kind: 'tag-input',
    title: 'What gym equipment do you have access to?',
    subtitle: 'List the equipment available to you so your coach can program realistically.',
    footerText: 'Include home gym equipment if you train at home.',
    placeholder: 'e.g. Barbell, dumbbells, cable machine',
  },
  injuries: {
    category: 'training',
    kind: 'tag-input',
    title: 'Do you have any injuries or limitations?',
    subtitle: 'This information helps us create a safe and effective training program for you.',
    footerText: 'Include anything that affects exercise selection, intensity, or range of motion.',
    placeholder: 'e.g. Lower back pain, knee injury, shoulder impingement (or leave blank)',
  },
  'avg-cardio-per-week': {
    category: 'training',
    kind: 'single-choice',
    title: 'How much cardio do you currently do?',
    subtitle: 'Choose the option that best describes your current cardiovascular exercise routine.',
    footerText: 'Your current cardio activity helps us balance your training program.',
    options: ['None', '1-2 times per week', '3-4 times per week', '5-6 times per week', 'Daily', 'Multiple times per day'],
  },
  'avg-steps-per-day': {
    category: 'training',
    kind: 'single-choice',
    title: 'How many steps do you average per day?',
    subtitle: 'Choose the range that best represents your typical daily step count.',
    footerText: 'Daily steps help your coach understand your baseline activity.',
    options: [
      'Less than 3,000 steps',
      '3,000 - 6,000 steps',
      '6,000 - 10,000 steps',
      '10,000 - 15,000 steps',
      'More than 15,000 steps',
      "I don't track my steps",
    ],
  },
  'food-preferences': {
    category: 'nutrition',
    kind: 'tag-input',
    title: 'What foods do you prefer?',
    subtitle: 'Tell us about foods you enjoy so your nutrition plan is easier to follow.',
    footerText: 'Include favorite meals, cuisines, or staples.',
    placeholder: 'e.g. Chicken, rice, Greek yogurt, pasta',
    suggestions: ['Vegetarian', 'Vegan', 'Keto', 'Paleo', 'Mediterranean', 'Low Carb'],
  },
  allergies: {
    category: 'nutrition',
    kind: 'tag-input',
    title: 'Do you have any allergies or intolerances?',
    subtitle: 'This helps your coach avoid foods that do not work for you.',
    footerText: 'Include dietary restrictions your coach should know.',
    placeholder: 'e.g. Peanuts, lactose, shellfish (or leave blank)',
    suggestions: ['Tree Nuts', 'Dairy', 'Gluten', 'Soy', 'Eggs', 'Shellfish', 'Fish'],
  },
  'daily-calories': {
    category: 'nutrition',
    kind: 'text',
    title: 'How many calories do you eat per day?',
    subtitle: 'Enter your approximate daily calories if you know them.',
    footerText: 'An estimate is fine. Leave this blank if you are not sure.',
    placeholder: 'e.g. 2200 (or leave blank)',
  },
  'daily-macros': {
    category: 'nutrition',
    kind: 'macros',
    title: 'What are your daily macros?',
    subtitle: 'Enter your approximate daily protein, carbs, and fat intake in grams (optional).',
    footerText: 'Your current macro intake helps us design balanced nutrition recommendations.',
  },
  'avg-number-meals-per-day': {
    category: 'nutrition',
    kind: 'single-choice',
    title: 'How many meals do you eat per day?',
    subtitle: 'Choose the option that best matches your usual eating schedule.',
    footerText: 'Meal frequency helps your coach make practical nutrition plans.',
    options: ['1-2 meals per day', '3 meals per day', '4-5 meals per day', '6+ meals per day', "I don't follow a regular meal schedule"],
  },
  'meals-you-usually-eat': {
    category: 'nutrition',
    kind: 'tag-input',
    title: 'What meals do you usually eat?',
    subtitle: 'Tell us about your typical meals and favorite dishes.',
    footerText: 'Your typical meals help us create practical nutrition recommendations.',
    placeholder: 'e.g. Eggs and toast, chicken salad, pasta',
  },
  'num-meals-before-gym': {
    category: 'nutrition',
    kind: 'single-choice',
    title: 'When do you eat before working out?',
    subtitle: 'Choose the option that best describes your typical pre-workout eating pattern.',
    footerText: 'Pre-workout timing helps your coach plan nutrition around training.',
    options: [
      'I eat right before working out',
      '1-2 hours before working out',
      '3-4 hours before working out',
      '5+ hours before working out',
      'I workout fasted (no food)',
      "I don't follow a consistent pattern",
    ],
  },
  'pre-workout-meal': {
    category: 'nutrition',
    kind: 'single-choice',
    title: 'Which meal of the day is closest to your training?',
    subtitle: 'This helps your coach plan meal timing and nutrition around your training sessions.',
    footerText: "Choose the meal of your day that's closest to when you train.",
    options: ['Meal 1', 'Meal 2', 'Meal 3', 'Meal 4', 'Meal 5', "I don't eat before training", 'It varies day to day'],
  },
  'recent-physique-shots': {
    category: 'personal',
    kind: 'text',
    note: 'This is just for reference. Your coach will help you take proper progress photos once you start training together.',
    title: 'Do you have recent physique photos?',
    subtitle: 'If you have recent progress photos, let us know. Your coach can help you take proper ones later.',
    footerText: 'Photos are optional but can help with body composition coaching.',
    placeholder: 'e.g. Yes, from last week / No recent photos',
  },
};

function base64UrlEncode(str: string) {
  return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(str.length + ((4 - (str.length % 4)) % 4), '=');
  return decodeURIComponent(escape(atob(padded)));
}

export function buildInviteLink(screens: OnboardingScreen[], coachName: string, coachId?: string): string {
  const payload = screens.map((s) => ({ k: s.key, e: s.enabled }));
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const url = new URL('/onboarding', window.location.origin);
  url.searchParams.set('config', encoded);
  if (coachName) url.searchParams.set('coach', coachName);
  if (coachId) url.searchParams.set('coachId', coachId);
  return url.toString();
}

// Shared by both invite formats: the old base64 `?config=` param decodes to
// this same {k,e}[] shape, and so does client_invites.screens_config (the
// server-side snapshot taken by useInviteLink's generateLink).
export function decodeScreensConfig(decoded: { k: string; e: boolean }[]): OnboardingScreen[] {
  const byKey = new Map(DEFAULT_ONBOARDING_SCREENS.map((s) => [s.key, s]));
  const result = decoded
    .map(({ k, e }) => {
      const base = byKey.get(k);
      return base ? { ...base, enabled: e } : null;
    })
    .filter((s): s is OnboardingScreen => s !== null);
  return result.length > 0 ? result : DEFAULT_ONBOARDING_SCREENS;
}

// Legacy fallback reader — old links generated before the server-issued
// invite system (buildServerInviteUrl below) still work, they just can't
// be revoked. Not used by the current generation path anymore.
export function parseInviteConfig(search: string): OnboardingScreen[] {
  const params = new URLSearchParams(search);
  const raw = params.get('config');
  if (!raw) return DEFAULT_ONBOARDING_SCREENS;
  try {
    const decoded = JSON.parse(base64UrlDecode(raw)) as { k: string; e: boolean }[];
    return decodeScreensConfig(decoded);
  } catch {
    return DEFAULT_ONBOARDING_SCREENS;
  }
}

// Current invite link format: an opaque server-issued id, resolved via the
// get_invite_link RPC (revocable, one active per coach) — see
// src/hooks/useInviteLink.ts.
export function buildServerInviteUrl(inviteId: string): string {
  const url = new URL('/onboarding', window.location.origin);
  url.searchParams.set('invite', inviteId);
  return url.toString();
}
