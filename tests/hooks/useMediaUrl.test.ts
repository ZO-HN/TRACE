import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {HookHarness,cleanup,deferred,settle} from './hookHarness';
import {useMediaUrl} from '../../src/hooks/useMediaUrl';
vi.mock('react',async()=> (await import('./hookHarness')).reactHooks);
const api=vi.hoisted(()=>({get:vi.fn(),session:vi.fn(),listener:null as null|((event:string,session:{user:{id:string}}|null)=>void),unsubscribe:vi.fn()}));
vi.mock('../../src/lib/storage/getUrl',()=>({getMediaUrl:(key:string)=>api.get(key)}));
vi.mock('../../src/lib/supabase',()=>({supabase:{auth:{getSession:()=>api.session(),onAuthStateChange:(fn:typeof api.listener)=>{api.listener=fn;return {data:{subscription:{unsubscribe:api.unsubscribe}}};}}}}));
beforeEach(()=>{vi.useFakeTimers();api.session.mockReset().mockResolvedValue({data:{session:{user:{id:'a'}}}});api.get.mockReset().mockResolvedValue({url:'https://fixture.test/a',expiresIn:600,contentType:'image/jpeg'});});
afterEach(()=>{cleanup();vi.useRealTimers();});
it('hides the old account link immediately and discards late reads when account/key changes',async()=>{
  let key:string|null='old';const hook=new HookHarness(()=>useMediaUrl(key));await settle();expect(hook.current.url).toBe('https://fixture.test/a');
  const late=deferred<{url:string;expiresIn:number}>();api.get.mockReturnValueOnce(late.promise);key='pending';hook.render();await settle();
  api.listener?.('SIGNED_IN',{user:{id:'b'}});hook.render();expect(hook.current.url).toBeNull();await settle();
  late.resolve({url:'https://fixture.test/stale',expiresIn:600});await settle();expect(hook.current.url).not.toBe('https://fixture.test/stale');
  key=null;hook.render();await settle();expect(hook.current).toMatchObject({url:null,error:null,loading:false});
});
it('expires a signed link, supports explicit reload and exposes verification/auth errors',async()=>{
  const hook=new HookHarness(()=>useMediaUrl('key'));await settle();expect(hook.current.contentType).toBe('image/jpeg');
  vi.advanceTimersByTime(599000);await settle();expect(hook.current.url).toBeNull();expect(hook.current.error).toContain('expired');
  hook.current.retry();await settle();expect(hook.current.url).toBe('https://fixture.test/a');
  api.get.mockRejectedValueOnce(new Error('Object unavailable'));hook.current.retry();await settle();expect(hook.current.error).toBe('Object unavailable');
  api.listener?.('SIGNED_OUT',null);await settle();expect(hook.current.url).toBeNull();expect(hook.current.error).toContain('Sign in');
});
it('auth events supersede a stale initial session response and invalid link responses never render',async()=>{
  const initial=deferred<{data:{session:{user:{id:string}}}}>();api.session.mockReturnValueOnce(initial.promise);
  const hook=new HookHarness(()=>useMediaUrl('key'));api.listener?.('SIGNED_OUT',null);await settle();initial.resolve({data:{session:{user:{id:'old'}}}});await settle();expect(api.get).not.toHaveBeenCalled();
  api.get.mockResolvedValueOnce({url:'http://unsafe.test',expiresIn:600});api.listener?.('SIGNED_IN',{user:{id:'b'}});await settle();expect(hook.current.url).toBeNull();expect(hook.current.error).toContain('Invalid media');
});
