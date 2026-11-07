import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {HookHarness,cleanup,deferred,settle} from './hookHarness';
import {useDirectChat} from '../../src/hooks/useDirectChat';
vi.mock('react',async()=> (await import('./hookHarness')).reactHooks);
const api=vi.hoisted(()=>({read:vi.fn(),send:vi.fn(),event:(_:any)=>{}}));
vi.mock('../../src/lib/supabase',()=>({supabase:{rpc:(name:string,p:unknown)=>name==='get_direct_messages_page'?api.read(p):api.send(p),channel:()=>{const c={on:(_:unknown,_f:unknown,event:typeof api.event)=>{api.event=event;return c;},subscribe:()=>c};return c;},removeChannel:vi.fn()}}));
const message=(id:string)=>({id,sender_id:'a',recipient_id:'b',content:id,created_at:'2026-11-07T00:00:00Z',read_at:null});
beforeEach(()=>{api.read.mockReset().mockResolvedValue({data:[],error:null});api.send.mockReset().mockImplementation(async p=>({data:{...message(p.p_message_id),content:p.p_content},error:null}));});afterEach(cleanup);
it('keeps a live insert while history loads and ignores canceled setup responses',async()=>{
  const wait=deferred<{data:unknown[],error:null}>();api.read.mockReturnValueOnce(wait.promise);
  const hook=new HookHarness(()=>useDirectChat('a','b'));api.event({new:message('live')});await settle();
  wait.resolve({data:[message('history')],error:null});await settle();expect(hook.current.messages.map(m=>m.id)).toEqual(['history','live']);
  const old=api.event;hook.replay();await settle();old({new:message('canceled')});await settle();expect(hook.current.messages).toEqual([]);
});
it('captures an exact send ID through a lost response and rejects altered retry text',async()=>{
  const hook=new HookHarness(()=>useDirectChat('a','b'));await settle();api.send.mockRejectedValueOnce(new Error('Offline'));
  await expect(hook.current.send('Hello')).rejects.toThrow('Offline');await settle();
  await expect(hook.current.send('Different')).rejects.toThrow('previous message');
  await hook.current.send('Hello');await settle();expect(api.send.mock.calls[1]).toEqual(api.send.mock.calls[0]);expect(hook.current.messages[0].content).toBe('Hello');
});
it('never starts a stale conversation send under the new owner',async()=>{
  let mine='a';const hook=new HookHarness(()=>useDirectChat(mine,'b'));await settle();const old=hook.current.send;
  mine='new-owner';hook.render();await settle();await expect(old('Old private draft')).rejects.toThrow('conversation changed');expect(api.send).not.toHaveBeenCalled();
});
