// TRACE Brain assistant panel — grounded scientific knowledge & study research assistant.
// Focuses on expanding context, providing detailed summaries of studies, and listing citation references with IDs.

import { useState } from 'react';

export interface StudyCitation {
  refId: string;
  title: string;
  source: string;
  year: number;
}

export interface ResearchAnswer {
  id: string;
  query: string;
  problemBreakdown: string;
  detailedSummary: string;
  citations: StudyCitation[];
}

export default function AiBrainPanel({ userId: _userId }: { userId: string }) {
  const [query, setQuery] = useState('');
  const [isResearching, setIsResearching] = useState(false);
  const [studies, setStudies] = useState<ResearchAnswer[]>([]);

  const handleResearch = () => {
    const text = query.trim();
    if (!text || isResearching) return;

    setIsResearching(true);

    // Mock research study output simulating RAG knowledge synthesis
    setTimeout(() => {
      const mockResult: ResearchAnswer = {
        id: Date.now().toString(),
        query: text,
        problemBreakdown: `Analysis of biological & biomechanical context for "${text}": Primary factors include neuromuscular fatigue, tendon stress accumulation, and movement velocity drop off during repeated concentric contractions.`,
        detailedSummary: `Scientific study synthesis indicates that progressive load modification paired with volume auto-regulation yields superior recovery outcomes compared to rigid fixed-volume protocols. Eccentric tempo control (3-4 seconds) reduces peak joint stress while preserving hypertrophy stimulus.`,
        citations: [
          {
            refId: 'REF-2025-JSCR-882',
            title: 'Auto-regulation and Velocity-Based Training in Hypertrophy Adaptation',
            source: 'Journal of Strength and Conditioning Research',
            year: 2025,
          },
          {
            refId: 'REF-2024-MSSE-419',
            title: 'Biomechanics of Patellar Tendon Strain During Submaximal Squatting',
            source: 'Medicine & Science in Sports & Exercise',
            year: 2024,
          },
        ],
      };

      setStudies((prev) => [mockResult, ...prev]);
      setIsResearching(false);
      setQuery('');
    }, 800);
  };

  return (
    <div className="bg-surface border border-border rounded-xl flex flex-col p-4 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            TRACE Brain — Knowledge & Study Engine
          </h3>
        </div>
        <span className="text-[10px] bg-primary/20 text-primary border border-primary/40 px-2 py-0.5 rounded-full font-medium">
          Research RAG
        </span>
      </div>

      <p className="text-xs text-gray-400 mb-3">
        Expand your knowledge on injuries, biomechanics, or recovery. Generates detailed study breakdowns with verified citations & reference IDs.
      </p>

      <div className="flex gap-2 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleResearch();
          }}
          placeholder="e.g. Research patellar tendonitis strain during heavy squatting"
          className="flex-1 h-10 bg-background border border-border rounded-lg px-3 text-sm text-gray-100 placeholder-gray-500 focus:border-primary outline-none transition-colors"
        />
        <button
          onClick={handleResearch}
          disabled={isResearching || !query.trim()}
          className="h-10 px-4 bg-primary hover:bg-primary-hover disabled:opacity-40 text-white rounded-lg text-sm font-semibold transition-colors"
        >
          {isResearching ? 'Analyzing...' : 'Research'}
        </button>
      </div>

      {/* Research Output Studies */}
      {studies.length === 0 ? (
        <div className="bg-background/50 border border-border/60 rounded-lg p-6 text-center">
          <p className="text-xs text-gray-500">
            Enter a question or topic above to run a scientific study synthesis with citation reference IDs.
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[22rem] overflow-y-auto pr-1">
          {studies.map((item) => (
            <div key={item.id} className="bg-background border border-border rounded-lg p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
                <span className="font-semibold text-primary">Topic: "{item.query}"</span>
                <span className="text-[10px] text-gray-400">Study Report</span>
              </div>

              <div>
                <span className="font-semibold text-gray-300 block mb-0.5">1. Context & Problem Breakdown</span>
                <p className="text-gray-400 leading-relaxed">{item.problemBreakdown}</p>
              </div>

              <div>
                <span className="font-semibold text-gray-300 block mb-0.5">2. Detailed Synthesis & Study Summary</span>
                <p className="text-gray-200 leading-relaxed bg-surface/60 p-2 rounded border border-border/40">
                  {item.detailedSummary}
                </p>
              </div>

              <div>
                <span className="font-semibold text-gray-300 block mb-1">3. Sources & Reference Citations</span>
                <div className="space-y-1">
                  {item.citations.map((c) => (
                    <div key={c.refId} className="flex items-start justify-between bg-surface/40 p-1.5 rounded text-[11px]">
                      <span className="text-gray-300">
                        {c.title} <em className="text-gray-500">({c.source}, {c.year})</em>
                      </span>
                      <span className="font-mono text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/30">
                        [{c.refId}]
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

