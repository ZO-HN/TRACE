import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {HookHarness,cleanup,deferred,settle} from './hookHarness';
import {useCoachProgramEditor} from '../../src/hooks/useCoachProgramEditor';
vi.mock('react',async()=> (await import('./hookHarness')).reactHooks);
const api=vi.hoisted(()=>({head:vi.fn(),delivery:vi.fn(),rpc:vi.fn()}));
vi.mock('../../src/lib/supabase',()=>({supabase:{rpc:(...args:unknown[])=>api.rpc(...args),from:()=>{
  const q={select:()=>q,eq:()=>q,order:()=>q,range:()=>api.delivery(),maybeSingle:()=>api.head()};return q;
}}}));
const slot={id:'slot',offset:0,label:'Train',template_id:'source'};
beforeEach(()=>{api.head.mockReset().mockResolvedValue({data:{revision:1,slots:[slot]},error:null});api.delivery.mockReset().mockResolvedValue({data:[],error:null});api.rpc.mockReset().mockImplementation(async(_name,p)=>({data:p.p_expected_revision+1,error:null}));});afterEach(cleanup);
it('keeps captured program bytes and operation identity through a lost response; server revision conflicts allow review',async()=>{
  const hook=new HookHarness(()=>useCoachProgramEditor('coach','program'));await settle();const slots=[{...slot}];api.rpc.mockRejectedValueOnce(new Error('Reply lost'));
  expect(await hook.current.save(1,slots)).toBe(false);await settle();slots[0].label='Changed after click';expect(hook.current.pending).toBe(true);
  expect(await hook.current.retry()).toBe(true);await settle();expect(api.rpc.mock.calls[1]).toEqual(api.rpc.mock.calls[0]);expect(api.rpc.mock.calls[0][1].p_slots[0].label).toBe('Train');
  api.rpc.mockResolvedValueOnce({data:null,error:{code:'40001',message:'Reload current revision'}});await hook.current.save(1,[slot]);await settle();expect(hook.current.pending).toBe(false);expect(hook.current.writeError).toContain('Reload');
});
it('scopes head/delivery reads and ignores canceled replies and stale write callbacks after account changes',async()=>{
  let coach='old';const wait=deferred<{data:unknown,error:null}>();api.head.mockReturnValueOnce(wait.promise);
  const hook=new HookHarness(()=>useCoachProgramEditor(coach,'program'));const oldSave=hook.current.save;coach='current';hook.render();await settle();
  wait.resolve({data:{revision:99,slots:[{...slot,label:'Private old program'}]},error:null});await settle();
  expect(hook.current.revision).toBe(1);expect(hook.current.slots[0].label).toBe('Train');expect(await oldSave(99,[slot])).toBe(false);expect(api.rpc).not.toHaveBeenCalled();
});
it('hides already loaded private days immediately while another account is still loading',async()=>{
  let coach='old';const hook=new HookHarness(()=>useCoachProgramEditor(coach,'program'));await settle();expect(hook.current.slots).toHaveLength(1);
  const wait=deferred<{data:unknown,error:null}>();api.head.mockReturnValueOnce(wait.promise);coach='current';hook.render();await settle();
  expect(hook.current.slots).toEqual([]);expect(hook.current.deliveries).toEqual([]);expect(hook.current.revision).toBe(0);
  wait.resolve({data:null,error:null});await settle();expect(hook.current.slots).toEqual([]);
});
it('coalesces in-flight saves and sends selected group delivery with a captured revision/date',async()=>{
  const hook=new HookHarness(()=>useCoachProgramEditor('coach','program'));await settle();const wait=deferred<{data:number,error:null}>();api.rpc.mockReturnValueOnce(wait.promise);
  const first=hook.current.save(1,[slot]);expect(hook.current.save(1,[slot])).toBe(first);await settle();expect(api.rpc).toHaveBeenCalledTimes(1);wait.resolve({data:2,error:null});await first;await settle();
  await hook.current.deliver({p_delivery_id:'delivery',p_group_id:'group',p_start_date:'2026-11-08',p_active:true,p_expected_revision:3});
  expect(api.rpc.mock.calls[1][0]).toBe('set_coach_program_delivery');expect(api.rpc.mock.calls[1][1]).toMatchObject({p_coach_id:'coach',p_program_id:'program',p_group_id:'group',p_expected_revision:3,p_start_date:'2026-11-08'});
});
