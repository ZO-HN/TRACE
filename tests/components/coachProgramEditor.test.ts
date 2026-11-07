import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import type {ReactElement} from 'react';
import {HookHarness,cleanup,settle} from '../hooks/hookHarness';
import CoachProgramEditor from '../../src/components/coach/CoachProgramEditor';
vi.mock('react',async original=>({...await original<typeof import('react')>(),...(await import('../hooks/hookHarness')).reactHooks}));
const api=vi.hoisted(()=>({save:vi.fn(),deliver:vi.fn(),slots:[] as any[],deliveries:[] as any[],pending:false,revision:0}));
vi.mock('../../src/hooks/useCoachProgramEditor',()=>({useCoachProgramEditor:()=>({slots:api.slots,deliveries:api.deliveries,revision:api.revision,loading:false,error:null,busy:false,pending:api.pending,writeError:null,refresh:vi.fn(),save:api.save,deliver:api.deliver,retry:vi.fn()})}));
vi.mock('../../src/hooks/useCoachPrivateWorkouts',()=>({useCoachPrivateWorkouts:()=>({rows:[{id:'source',name:'Squat',template_items:[{}]}],loading:false,error:null})}));
vi.mock('../../src/hooks/useClients',()=>({useClients:()=>({clients:[{id:'trainee',first_name:'A',last_name:'Client'}],isLoading:false,error:null})}));
vi.mock('../../src/hooks/useTrainingGroups',()=>({useTrainingGroups:()=>({groups:[{id:'group',name:'Morning'}],isLoading:false,error:null})}));
type Element=ReactElement<Record<string,any>>;
function nodes(v:any):Element[]{return Array.isArray(v)?v.flatMap(nodes):v?.props?[v,...nodes(v.props.children)]:[];}
function text(v:any):string{return Array.isArray(v)?v.map(text).join(''):v?.props?text(v.props.children):typeof v==='string'?v:'';}
const button=(root:Element,label:string)=>nodes(root).find(n=>n.type==='button'&&text(n)===label)!;
const input=(root:Element,label:string)=>nodes(root).find(n=>n.props['aria-label']===label)!;
beforeEach(()=>{api.save.mockReset().mockResolvedValue(true);api.deliver.mockReset().mockResolvedValue(true);api.slots=[];api.deliveries=[];api.pending=false;api.revision=0;});afterEach(cleanup);
it('authors stable explicit workout/rest days and prevents silent loss of unsaved days during a delivery refresh',async()=>{
  const hook=new HookHarness(()=>CoachProgramEditor({coachId:'coach',programId:'program',name:'Plan',onClose:vi.fn()}));await settle();
  button(hook.current,'Add program day').props.onClick();await settle();input(hook.current,'Day workout 1').props.onChange({target:{value:'source'}});await settle();
  button(hook.current,'Save program revision').props.onClick();await settle();
  expect(api.save).toHaveBeenCalledWith(0,[expect.objectContaining({offset:0,label:'Day 1',template_id:'source',id:expect.any(String)})]);
  expect(nodes(hook.current).find(n=>n.type==='fieldset'&&text(n).includes('Live delivery'))?.props.disabled).toBe(true);
});
it('configures an existing group delivery using its revision and preserves pending operation input',async()=>{
  api.revision=2;api.slots=[{id:'slot',offset:0,label:'Train',template_id:'source'}];api.deliveries=[{id:'delivery',group_id:'group',trainee_id:null,program_id:'program',start_date:'2026-11-08',active:true,revision:3}];
  const hook=new HookHarness(()=>CoachProgramEditor({coachId:'coach',programId:'program',name:'Plan',onClose:vi.fn()}));await settle();
  input(hook.current,'Program recipient').props.onChange({target:{value:'group:group'}});await settle();button(hook.current,'Save live delivery').props.onClick();await settle();
  expect(api.deliver).toHaveBeenCalledWith(expect.objectContaining({p_delivery_id:'delivery',p_group_id:'group',p_start_date:'2026-11-08',p_expected_revision:3,p_active:true}));
  api.pending=true;hook.render();expect(button(hook.current,'Close program').props.disabled).toBe(true);expect(text(hook.current)).toContain('Outcome uncertain');
});
