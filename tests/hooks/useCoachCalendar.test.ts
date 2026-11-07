import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {HookHarness,cleanup,deferred,settle} from './hookHarness';
import {useCalendarWrite,useCoachCalendar} from '../../src/hooks/useCoachCalendar';
vi.mock('react',async()=> (await import('./hookHarness')).reactHooks);
const api=vi.hoisted(()=>({read:vi.fn(),rpc:vi.fn(),filters:[] as unknown[][]}));
vi.mock('../../src/lib/supabase',()=>({supabase:{rpc:(...args:unknown[])=>api.rpc(...args),from:()=>{
  const q={select:()=>q,eq:(...args:unknown[])=>{api.filters.push(args);return q;},gte:()=>q,lte:()=>q,order:()=>q,range:(...args:unknown[])=>api.read(...args)};return q;
}}}));
const event=(id:string)=>({id,coach_id:'a',trainee_id:'t',template_id:`copy-${id}`,workout_name:'Saved',scheduled_date:'2026-11-07',cancelled:false,revision:1,created_at:'2026-11-07'});
const args={p_operation_id:'op',p_event_id:'event',p_template_id:'copy',p_source_template_id:'source',p_trainee_id:'t',p_date:'2026-11-07',p_expected_snapshot:{name:'Workout'}};
beforeEach(()=>{api.read.mockReset().mockResolvedValue({data:[],error:null});api.rpc.mockReset().mockImplementation(async(_name,p)=>({data:p.p_event_id,error:null}));api.filters=[];});afterEach(cleanup);
it('pages the whole selected month and guards canceled setup and owner reads',async()=>{
  api.read.mockResolvedValueOnce({data:Array.from({length:200},(_,i)=>event(String(i))),error:null}).mockResolvedValueOnce({data:[event('last')],error:null});
  let owner='a';const hook=new HookHarness(()=>useCoachCalendar(owner,'2026-11-01','2026-11-30','t'));await settle();
  expect(hook.current.rows).toHaveLength(201);expect(api.read.mock.calls[1]).toEqual([200,399]);expect(api.filters).toContainEqual(['trainee_id','t']);
  const pending=deferred<{data:ReturnType<typeof event>[],error:null}>();api.read.mockReturnValueOnce(pending.promise);
  hook.replay();await settle();owner='b';hook.render();await settle();pending.resolve({data:[event('stale')],error:null});await settle();
  expect(hook.current.rows).toEqual([]);expect(api.filters).toContainEqual(['coach_id','b']);
});
it('holds exact IDs/content for response-loss retry, rejects changed input and stale writers',async()=>{
  let owner='a';const hook=new HookHarness(()=>useCalendarWrite(owner));await settle();api.rpc.mockRejectedValueOnce(new Error('Lost response'));
  expect(await hook.current.schedule(args)).toBe(false);await settle();expect(hook.current.pending).toBe(true);
  expect(await hook.current.schedule({...args,p_date:'2026-11-08'})).toBe(false);expect(api.rpc).toHaveBeenCalledTimes(1);
  expect(await hook.current.retry()).toBe(true);await settle();expect(api.rpc.mock.calls[1]).toEqual(api.rpc.mock.calls[0]);
  const stale=hook.current.schedule;owner='b';hook.render();await settle();expect(await stale(args)).toBe(false);expect(api.rpc).toHaveBeenCalledTimes(2);
});
it('coalesces pending taps, verifies receipts and exposes read errors instead of empty success',async()=>{
  const wait=deferred<{data:string,error:null}>();api.rpc.mockReturnValueOnce(wait.promise);
  const write=new HookHarness(()=>useCalendarWrite('a'));const first=write.current.schedule(args);const second=write.current.schedule(args);
  expect(first).toBe(second);await settle();expect(api.rpc).toHaveBeenCalledTimes(1);wait.resolve({data:'wrong-id',error:null});await first;await settle();expect(write.current.error).toContain('Unknown');
  api.read.mockResolvedValueOnce({data:null,error:{message:'No connection'}});const read=new HookHarness(()=>useCoachCalendar('a','2026-11-01','2026-11-30'));await settle();expect(read.current.error).toBe('No connection');
  await read.current.refresh();await settle();expect(read.current.error).toBeNull();expect(read.current.rows).toEqual([]);
});
