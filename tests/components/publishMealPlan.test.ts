import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import type {ReactElement} from 'react';
import {HookHarness,cleanup,deferred,settle} from '../hooks/hookHarness';
import PublishMealPlan from '../../src/components/coach/PublishMealPlan';
vi.mock('react',async original=>({...await original<typeof import('react')>(),...(await import('../hooks/hookHarness')).reactHooks}));
const api=vi.hoisted(()=>({rpc:vi.fn()}));vi.mock('../../src/lib/supabase',()=>({supabase:{rpc:(...args:unknown[])=>api.rpc(...args)}}));
type Element=ReactElement<Record<string,any>>;
function nodes(v:any):Element[]{return Array.isArray(v)?v.flatMap(nodes):v?.props?[v,...nodes(v.props.children)]:[];}
function text(v:any):string{return Array.isArray(v)?v.map(text).join(''):v?.props?text(v.props.children):typeof v==='string'?v:'';}
const button=(root:Element,label:string)=>nodes(root).find(n=>n.type==='button'&&text(n).includes(label))!;
const plan={id:'plan',client_id:'trainee',name:'Plan',data:{appliedTarget:2000,days:[]},created_at:'2026-11-07'};
beforeEach(()=>{api.rpc.mockReset().mockImplementation(async(_name,p)=>({data:p.p_assignment_id,error:null}));});afterEach(cleanup);
it('publishes only explicitly with captured recipient/date/source data and coalesces taps',async()=>{
  const hook=new HookHarness(()=>PublishMealPlan({coachId:'coach',plan,clients:[{id:'trainee',first_name:'A',last_name:'Client'}]}));
  expect(api.rpc).not.toHaveBeenCalled();button(hook.current,'Publish to trainee').props.onClick();await settle();
  const wait=deferred<{data:string,error:null}>();api.rpc.mockReturnValueOnce(wait.promise);
  const handler=button(hook.current,'Publish fixed meal plan').props.onClick;handler();handler();expect(api.rpc).toHaveBeenCalledTimes(1);
  const payload=api.rpc.mock.calls[0][1];expect(payload).toMatchObject({p_coach_id:'coach',p_plan_id:'plan',p_trainee_id:'trainee',p_expected_data:plan.data});
  wait.resolve({data:payload.p_assignment_id,error:null});await settle();expect(text(hook.current)).toContain('Published copy');
});
it('retries an uncertain publication with exactly the same identities',async()=>{
  api.rpc.mockRejectedValueOnce(new Error('Response lost'));
  const hook=new HookHarness(()=>PublishMealPlan({coachId:'coach',plan,clients:[]}));button(hook.current,'Publish to trainee').props.onClick();await settle();
  button(hook.current,'Publish fixed meal plan').props.onClick();await settle();expect(text(hook.current)).toContain('Response lost');
  button(hook.current,'Retry same publication').props.onClick();await settle();expect(api.rpc.mock.calls[1]).toEqual(api.rpc.mock.calls[0]);
});
