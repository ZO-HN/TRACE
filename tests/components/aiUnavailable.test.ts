import {expect,it,vi} from 'vitest';
import CopilotDrawer from '../../src/components/copilot/CopilotDrawer';
import AiBrainPanel from '../../src/components/chat/AiBrainPanel';
import {AI_AVAILABLE} from '../../src/lib/aiAvailability';
const ai=vi.hoisted(()=>({hook:vi.fn()}));
vi.mock('../../src/hooks/useAiChat',()=>({useAiChat:ai.hook}));
vi.mock('../../src/components/ui/shadcn/sheet',()=>({Sheet:'aside',SheetContent:'div',SheetTitle:'h2',SheetDescription:'p'}));
vi.mock('../../src/components/ui/shadcn/scroll-area',()=>({ScrollArea:'div'}));
function text(v:any):string{return Array.isArray(v)?v.map(text).join(''):v?.props?text(v.props.children):typeof v==='string'?v:'';}
it('shows actual V1 unavailability without mounting the chat hook or simulated research',()=>{
  expect(AI_AVAILABLE).toBe(false);
  const drawer=CopilotDrawer({open:true,onOpenChange:vi.fn(),userId:'coach'});
  expect(text(drawer)).toContain('AI unavailable in V1');expect(ai.hook).not.toHaveBeenCalled();
  const research=AiBrainPanel({userId:'coach'});
  expect(text(research)).toContain('does not generate study summaries or citations');
  expect(text(research)).not.toContain('Scientific study synthesis');
});
