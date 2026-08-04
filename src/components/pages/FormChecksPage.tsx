import { ClipboardCheck } from 'lucide-react';
import { Select, Input } from '@/components/ui/shadcn/field';

export default function FormChecksPage() {
  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <ClipboardCheck size={18} className="text-success" />
        <h1 className="text-lg font-bold text-foreground">Form Checks</h1>
        <span className="text-sm text-muted-foreground">0 form checks</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select className="w-40" defaultValue="unreviewed">
          <option value="unreviewed">Unreviewed</option>
          <option value="reviewed">Reviewed</option>
          <option value="all">All</option>
        </Select>
        <Select className="w-40" defaultValue="all-clients">
          <option value="all-clients">All clients</option>
        </Select>
        <Select className="w-40" defaultValue="all-exercises">
          <option value="all-exercises">All exercises</option>
        </Select>
        <Input type="date" className="w-40" />
        <Input type="date" className="w-40" />
      </div>

      <div className="flex flex-col items-center justify-center gap-2 text-center py-24">
        <ClipboardCheck size={32} className="text-muted-foreground" />
        <p className="text-lg font-semibold text-foreground">You're all caught up</p>
        <p className="text-sm text-muted-foreground">New client form checks will appear here for review.</p>
      </div>
    </div>
  );
}
