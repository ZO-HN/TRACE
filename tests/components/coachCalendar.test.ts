import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import type {ReactElement} from 'react';
import {HookHarness,cleanup,settle} from '../hooks/hookHarness';
import CalendarPage from '../../src/components/pages/CalendarPage';
vi.mock('react',async original=>({...await original<typeof import('react')>(),...(await import('../hooks/hookHarness')).reactHooks}));
const api=vi.hoisted(()=>({schedule:vi.fn(),change:vi.fn(),refresh:vi.fn(),retry:vi.fn(),role:'coach',pending:false,error:null as string|null}));
vi.mock('../../src/components/layout/AppShell',()=>({useProfile:()=>({id:'coach',role:api.role})}));
vi.mock('../../src/hooks/useClients',()=>({useClients:()=>({clients:[{id:'trainee',first_name:'A',last_name:'Client'}],isLoading:false,error:null,refresh:vi.fn()})}));
const workout={id:'source',name:'Squat',description:null,created_at:'2026-11-07',template_items:[{id:'item',exercise_id:'exercise',position:1,target_sets:3,target_reps:8,target_rpe:null,rest_seconds:0,exercise:{id:'exercise',name:'Squat'}}]};
vi.mock('../../src/hooks/useCoachPrivateWorkouts',()=>({useCoachPrivateWorkouts:()=>({rows:[workout],loading:false,error:null})}));
vi.mock('../../src/hooks/useCoachCalendar',()=>({useCoachCalendar:()=>({rows:[{id:'event',trainee_id:'trainee',template_id:'copy',workout_name:'Squat',scheduled_date:'2026-12-31',revision:1,cancelled:false}],loading:false,error:null,refresh:api.refresh}),
  useCalendarWrite:()=>({schedule:api.schedule,change:api.change,retry:api.retry,pending:api.pending,busy:false,error:api.error})}));
type Element=ReactElement<Record<string,any>>;
function nodes(v:any):Element[]{return Array.isArray(v)?v.flatMap(nodes):v?.props?[v,...nodes(v.props.children)]:[];}
function text(v:any):string{return Array.isArray(v)?v.map(text).join(''):v?.props?text(v.props.children):typeof v==='string'?v:'';}
const button=(root:Element,label:string)=>nodes(root).find(n=>n.type==='button'&&text(n)===label)!;
const input=(root:Element,label:string)=>nodes(root).find(n=>n.props['aria-label']===label)!;
function renderCalendar(){return new HookHarness(()=>{const root=CalendarPage();return typeof root.type==='function'?(root.type as (p:unknown)=>Element)(root.props):root;});}
beforeEach(()=>{api.schedule.mockReset().mockResolvedValue(true);api.change.mockReset().mockResolvedValue(true);api.refresh.mockReset();api.pending=false;api.error=null;api.role='coach';});afterEach(cleanup);
it('persists the chosen linked trainee/date and real ordered workout snapshot, then reloads',async()=>{
  const hook=renderCalendar();expect(api.schedule).not.toHaveBeenCalled();
  input(hook.current,'Calendar trainee').props.onChange({target:{value:'trainee'}});input(hook.current,'Calendar workout').props.onChange({target:{value:'source'}});input(hook.current,'Workout date').props.onChange({target:{value:'2026-12-31'}});await settle();
  await button(hook.current,'Save dated assignment').props.onClick();await settle();
  expect(api.schedule).toHaveBeenCalledWith(expect.objectContaining({p_trainee_id:'trainee',p_date:'2026-12-31',p_source_template_id:'source',p_expected_snapshot:{name:'Squat',description:null,items:[{exercise_id:'exercise',position:1,target_sets:3,target_reps:8,target_rpe:null,rest_seconds:0}]}}));
  expect(api.refresh).toHaveBeenCalledTimes(1);
});
it('changes a captured revision and holds uncertain operations; trainee role cannot mount coach calendar',async()=>{
  const hook=renderCalendar();button(hook.current,'Move or cancel').props.onClick();await settle();
  input(hook.current,'Rescheduled date').props.onChange({target:{value:'2027-01-01'}});await settle();await button(hook.current,'Save new date').props.onClick();
  expect(api.change).toHaveBeenCalledWith(expect.objectContaining({p_event_id:'event',p_expected_revision:1,p_date:'2027-01-01',p_cancelled:false}));
  api.pending=true;api.error='Lost response';hook.render();expect(button(hook.current,'Save dated assignment').props.disabled).toBe(true);expect(text(hook.current)).toContain('Lost response');
  api.role='trainee';const denied=renderCalendar();expect(text(denied.current)).toContain('coach account is required');
});
