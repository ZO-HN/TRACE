import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Zap } from 'lucide-react';
import Card from '../ui/Card';

interface AppControlCopilotProps {
  userId: string;
  isCoach: boolean;
}

interface ActionLog {
  id: string;
  prompt: string;
  actionTaken: string;
  status: 'SUCCESS' | 'EXECUTING' | 'FAILED';
  timestamp: string;
}

export default function AppControlCopilot({ userId: _userId, isCoach }: AppControlCopilotProps) {
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<ActionLog[]>([]);

  const handleExecute = () => {
    const text = prompt.trim();
    if (!text || isProcessing) return;

    setIsProcessing(true);
    const newLogId = Date.now().toString();

    let actionResponse = '';
    if (isCoach) {
      if (text.toLowerCase().includes('assign') || text.toLowerCase().includes('plan')) {
        actionResponse = 'Assigned "Hypertrophy Block A" to 3 active trainees on your roster and updated start dates.';
      } else if (text.toLowerCase().includes('message') || text.toLowerCase().includes('send')) {
        actionResponse = 'Dispatched check-in message to all trainees with missed workouts in the last 48 hours.';
      } else {
        actionResponse = `Executed coach command: Configured roster schedule and batch updated client parameters based on "${text}".`;
      }
    } else {
      if (text.toLowerCase().includes('bench') || text.toLowerCase().includes('squat') || text.toLowerCase().includes('log')) {
        actionResponse = 'Recorded set details into offline outbox: 3 sets x 10 reps @ 185 lbs (e1RM: 246 lbs).';
      } else if (text.toLowerCase().includes('macro') || text.toLowerCase().includes('protein')) {
        actionResponse = 'Logged daily nutrition biometrics: +80g Protein, 2,400 kcal.';
      } else {
        actionResponse = `Recorded session detail and updated app configuration based on "${text}".`;
      }
    }

    setTimeout(() => {
      setLogs((prev) => [
        {
          id: newLogId,
          prompt: text,
          actionTaken: actionResponse,
          status: 'SUCCESS',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        ...prev,
      ]);
      setIsProcessing(false);
      setPrompt('');
    }, 600);
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            {isCoach ? 'Coach Command Copilot' : 'App One-Prompt Manager'}
          </h3>
        </div>
        <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-medium">
          Control Plane
        </span>
      </div>

      <p className="text-xs text-gray-400 mb-3">
        {isCoach
          ? 'Manage clients, assign plans, batch-send check-ins, or adjust schedules in a single prompt.'
          : 'Record sets, log macros, or update session settings instantly with one command.'}
      </p>

      <div className="flex gap-2 mb-3">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleExecute();
          }}
          placeholder={
            isCoach
              ? 'e.g. Assign Hypertrophy Block A to all beginners starting next Monday'
              : 'e.g. Log 3 sets of Bench Press at 185 lbs for 8 reps'
          }
          className="flex-1 h-10 bg-background border border-border rounded-xl px-3 text-sm text-gray-100 placeholder-gray-500 focus:border-emerald-500 outline-none transition-colors"
        />
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleExecute}
          disabled={isProcessing || !prompt.trim()}
          className="h-10 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5"
        >
          {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
          {isProcessing ? 'Executing...' : 'Run'}
        </motion.button>
      </div>

      {/* Action execution history */}
      <AnimatePresence>
        {logs.length > 0 && (
          <div className="space-y-2 mt-3 pt-3 border-t border-border/60">
            <span className="text-[11px] font-semibold text-gray-400">Executed Actions</span>
            {logs.slice(0, 3).map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-background/80 border border-border rounded-xl p-2.5 text-xs space-y-1"
              >
                <div className="flex items-center justify-between text-gray-400">
                  <span className="font-medium text-emerald-400">⚡ "{log.prompt}"</span>
                  <span>{log.timestamp}</span>
                </div>
                <p className="text-gray-200">{log.actionTaken}</p>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </Card>
  );
}
