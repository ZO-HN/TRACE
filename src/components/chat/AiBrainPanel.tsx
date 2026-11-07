// TRACE Brain assistant panel — grounded scientific knowledge & study research assistant.
// Focuses on expanding context, providing detailed summaries of studies, and listing citation references with IDs.


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
  return <section className="p-6"><h2 className="text-lg font-semibold">Research assistant unavailable in V1</h2><p className="text-sm text-muted-foreground mt-3">AI research is not enabled. This panel does not generate study summaries or citations.</p></section>;
}
