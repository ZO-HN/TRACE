import { useState, useEffect, useRef, useMemo } from 'react';
import { useOutboxStore } from '../../lib/outbox/outboxStore';
import { isValidSetInput, toSetLogInsert } from '../../lib/outbox/mapSetLog';
import { useExerciseCatalog } from '../../hooks/useExerciseCatalog';
import { lookupExerciseId } from '../../lib/workout/catalog';
import { createSessionDraft, sessionInsertFrom } from '../../lib/workout/session';
import { useAssignedWorkout } from '../../hooks/useAssignedWorkout';
import { useMediaUpload } from '../../hooks/useMediaUpload';
import MediaViewer from '../media/MediaViewer';

// --- Types ---
type SetData = {
  id: string;
  weight: string;
  reps: string;
  rpe: string;
  completed: boolean;
};

type Exercise = {
  id: string;
  name: string;
  sets: SetData[];
};

// --- Helper Functions ---
const calculateE1RM = (weightStr: string, repsStr: string): string => {
  const weight = parseFloat(weightStr);
  const reps = parseInt(repsStr, 10);
  if (isNaN(weight) || isNaN(reps) || reps < 1 || weight < 0) return '-';
  const e1RM = weight * (1 + reps / 30.0);
  return Math.round(e1RM).toString();
};

const playFinishSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);
    
    gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.error("Audio playback failed", e);
  }
};

// --- Mock Data ---
const initialWorkout: Exercise[] = [
  {
    id: 'e1',
    name: 'Barbell Back Squat',
    sets: [
      { id: 's1-1', weight: '135', reps: '10', rpe: '7', completed: false },
      { id: 's1-2', weight: '225', reps: '8', rpe: '8', completed: false },
    ],
  },
  {
    id: 'e2',
    name: 'Romanian Deadlift',
    sets: [
      { id: 's2-1', weight: '185', reps: '10', rpe: '7', completed: false },
      { id: 's2-2', weight: '205', reps: '8', rpe: '8', completed: false },
    ],
  }
];

export default function GymLogger({
  userId,
  isCoached = false,
}: {
  userId: string;
  isCoached?: boolean;
}) {
  const [exercises, setExercises] = useState<Exercise[]>(initialWorkout);

  // Real workout content (assigned template for coached, public for solo).
  // Falls back to the built-in mock when nothing loads (offline / empty DB).
  const { templateId, templateName, exercises: templateExercises } =
    useAssignedWorkout(userId, isCoached);

  // Offline outbox: completed sets are queued locally and flushed to Supabase
  // by useOutboxSync when connectivity returns.
  const enqueueSetLog = useOutboxStore((s) => s.enqueueSetLog);
  const ensureSessionQueued = useOutboxStore((s) => s.ensureSessionQueued);
  const pendingCount = useOutboxStore(
    (s) => s.items.filter((i) => i.status !== 'synced').length,
  );

  // Client-first session: the row is created with a client UUID so offline
  // set_logs can reference it; the parent row flushes before its sets.
  const sessionRef = useRef(createSessionDraft(userId, 'Current Workout'));

  // Real exercise ids from the DB catalog (matched by name). Until the
  // catalog loads (e.g. offline cold start), fall back to placeholder ids —
  // those items retry and only succeed once real ids exist.
  const { byName: catalogByName } = useExerciseCatalog();
  const placeholderIds = useMemo(
    () =>
      Object.fromEntries(
        initialWorkout.map((e) => [e.id, crypto.randomUUID()]),
      ) as Record<string, string>,
    [],
  );

  // Form-check clips: uploaded to R2 pre-completion; the object key rides
  // along on the queued set log (set_logs.form_video_s3_key).
  const media = useMediaUpload();
  const [videoKeys, setVideoKeys] = useState<Record<string, string>>({});
  const [uploadingSetId, setUploadingSetId] = useState<string | null>(null);
  const [viewingSetId, setViewingSetId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingSetIdRef = useRef<string | null>(null);

  const attachClip = (setId: string) => {
    pendingSetIdRef.current = setId;
    fileInputRef.current?.click();
  };

  const onClipSelected = async (file: File | undefined) => {
    const setId = pendingSetIdRef.current;
    if (!file || !setId) return;
    setUploadingSetId(setId);
    try {
      const { key } = await media.upload(file, 'form-video');
      setVideoKeys((prev) => ({ ...prev, [setId]: key }));
    } catch {
      // media.error carries the message; surfaced next to the button below
    } finally {
      setUploadingSetId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Rest Timer State
  const [restTimerActive, setRestTimerActive] = useState(false);
  const [restSecondsRemaining, setRestSecondsRemaining] = useState(0);
  const timerRef = useRef<number | null>(null);

  // Adopt template content once it loads — but never clobber logged work.
  useEffect(() => {
    if (!templateExercises) return;
    setExercises((current) => {
      const hasLoggedWork = current.some((e) => e.sets.some((s) => s.completed));
      return hasLoggedWork ? current : (templateExercises as Exercise[]);
    });
    if (templateName) {
      sessionRef.current = { ...sessionRef.current, sessionName: templateName };
    }
  }, [templateExercises, templateName]);

  // Handle Set Update
  const updateSet = (eIndex: number, sIndex: number, field: keyof SetData, value: string | boolean) => {
    const updated = [...exercises];
    const targetSet = updated[eIndex].sets[sIndex];
    targetSet[field] = value as never;

    // If completing the set, trigger rest timer and queue the log offline.
    if (field === 'completed' && value === true) {
      startRestTimer(90); // Default 90 seconds rest

      const exercise = updated[eIndex];
      const input = {
        id: crypto.randomUUID(),
        sessionId: sessionRef.current.id,
        // Template-loaded exercises carry their real DB UUID as their id;
        // otherwise resolve via catalog name match, then placeholder.
        exerciseId:
          lookupExerciseId(catalogByName, exercise.name) ??
          placeholderIds[exercise.id] ??
          exercise.id,
        setNumber: sIndex + 1,
        weightLbs: targetSet.weight,
        reps: targetSet.reps,
        rpe: targetSet.rpe,
        formVideoKey: videoKeys[targetSet.id] ?? null,
      };
      if (isValidSetInput(input)) {
        // Parent session first (refreshes duration while unsynced), then the set.
        void ensureSessionQueued(
          sessionInsertFrom(sessionRef.current, Date.now(), templateId),
        );
        void enqueueSetLog(toSetLogInsert(input));
      }
    }

    setExercises(updated);
  };

  const startRestTimer = (seconds: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRestSecondsRemaining(seconds);
    setRestTimerActive(true);

    timerRef.current = window.setInterval(() => {
      setRestSecondsRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          playFinishSound();
          setRestTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelRestTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRestTimerActive(false);
    setRestSecondsRemaining(0);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full max-w-full overflow-hidden bg-background text-gray-100 flex flex-col relative pb-24">
      {/* Scrollable Exercises List */}
      <div className="flex-1 overflow-y-auto w-full max-w-md mx-auto px-4 py-6 space-y-8">
        
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-white">
            {templateName ?? 'Current Workout'}
          </h1>
          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              {pendingCount} queued
            </span>
          )}
        </div>
        
        {exercises.map((exercise, eIndex) => (
          <div key={exercise.id} className="bg-surface rounded-xl border border-border overflow-hidden">
            <div className="bg-border/30 px-4 py-3 border-b border-border">
              <h2 className="text-lg font-semibold text-white">{exercise.name}</h2>
            </div>
            
            <div className="p-2 space-y-2">
              {/* Set Headers */}
              <div className="grid grid-cols-[30px_1fr_1fr_1fr_60px] gap-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                <span className="text-left">Set</span>
                <span>lbs</span>
                <span>Reps</span>
                <span>RPE</span>
                <span>Done</span>
              </div>

              {/* Set Rows */}
              {exercise.sets.map((set, sIndex) => {
                const e1RM = calculateE1RM(set.weight, set.reps);
                
                return (
                  <div key={set.id} className={`flex flex-col gap-2 p-2 rounded-lg transition-colors ${set.completed ? 'bg-green-900/10' : 'bg-transparent'}`}>
                    <div className="grid grid-cols-[30px_1fr_1fr_1fr_60px] items-center gap-2">
                      <span className="text-gray-400 font-medium text-sm text-center">{sIndex + 1}</span>
                      
                      <input 
                        type="number" 
                        inputMode="decimal"
                        value={set.weight}
                        onChange={(e) => updateSet(eIndex, sIndex, 'weight', e.target.value)}
                        disabled={set.completed}
                        className="w-full h-12 bg-background border border-border rounded-lg text-center font-medium focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow disabled:opacity-50"
                      />
                      
                      <input 
                        type="number" 
                        inputMode="numeric"
                        value={set.reps}
                        onChange={(e) => updateSet(eIndex, sIndex, 'reps', e.target.value)}
                        disabled={set.completed}
                        className="w-full h-12 bg-background border border-border rounded-lg text-center font-medium focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow disabled:opacity-50"
                      />

                      <select 
                        value={set.rpe}
                        onChange={(e) => updateSet(eIndex, sIndex, 'rpe', e.target.value)}
                        disabled={set.completed}
                        className="w-full h-12 bg-background border border-border rounded-lg text-center font-medium focus:border-primary outline-none appearance-none disabled:opacity-50 px-2"
                      >
                        <option value="">-</option>
                        {[...Array(10)].map((_, i) => (
                          <option key={i+1} value={i+1}>{i+1}</option>
                        ))}
                      </select>

                      <div className="flex justify-center">
                        <button
                          onClick={() => updateSet(eIndex, sIndex, 'completed', !set.completed)}
                          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                            set.completed 
                              ? 'bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]' 
                              : 'bg-surface border-2 border-border text-transparent hover:border-gray-400'
                          }`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    {/* e1RM Badge + form clip attach */}
                    <div className="flex items-center justify-between px-[38px]">
                      <div className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-semibold px-2 py-1 rounded">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="6.5"/></svg>
                        e1RM: {e1RM} lbs
                      </div>
                      {videoKeys[set.id] ? (
                        <button
                          onClick={() =>
                            setViewingSetId((cur) => (cur === set.id ? null : set.id))
                          }
                          className="text-xs font-medium px-2 py-1 rounded bg-green-500/15 text-green-400"
                        >
                          {viewingSetId === set.id ? 'Hide clip' : 'View clip'}
                        </button>
                      ) : (
                        !set.completed && (
                          <button
                            onClick={() => attachClip(set.id)}
                            disabled={uploadingSetId === set.id}
                            className="text-xs font-medium px-2 py-1 rounded bg-border/40 text-gray-400 hover:text-gray-200"
                          >
                            {uploadingSetId === set.id ? 'Uploading...' : '+ Form clip'}
                          </button>
                        )
                      )}
                    </div>

                    {viewingSetId === set.id && videoKeys[set.id] && (
                      <div className="px-[38px]">
                        <MediaViewer objectKey={videoKeys[set.id]} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Hidden capture input for form-check clips */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void onClipSelected(e.target.files?.[0])}
      />
      {media.error && (
        <p className="px-4 pb-2 text-xs text-red-400 text-center">{media.error}</p>
      )}

      {/* Rest Timer Overlay */}
      {restTimerActive && (
        <div className="fixed bottom-4 left-4 right-4 sm:max-w-md sm:mx-auto z-50">
          <div className="bg-surface border border-primary/30 shadow-2xl shadow-primary/10 rounded-2xl p-4 flex items-center justify-between animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Resting</h3>
                <div className="text-2xl font-mono font-bold text-white tracking-widest">{formatTime(restSecondsRemaining)}</div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button onClick={() => setRestSecondsRemaining(p => p + 30)} className="w-10 h-10 bg-background border border-border rounded-lg text-sm font-medium hover:bg-border transition-colors">+30</button>
              <button onClick={cancelRestTimer} className="w-10 h-10 bg-background border border-border rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors">Skip</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
