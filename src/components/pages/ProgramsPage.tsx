import { useProfile } from '@/components/layout/AppShell';
import TemplateBuilder from '@/components/coach/TemplateBuilder';

export default function ProgramsPage() {
  const profile = useProfile();

  return (
    <div className="p-6 max-w-4xl mx-auto flex flex-col gap-4">
      <h1 className="text-lg font-bold text-foreground">Programs</h1>
      <TemplateBuilder coachId={profile.id} />
    </div>
  );
}
