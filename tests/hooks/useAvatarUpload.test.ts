import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {HookHarness,cleanup,deferred,settle} from './hookHarness';
import {useAvatarUpload} from '../../src/hooks/useAvatarUpload';
vi.mock('react',async()=> (await import('./hookHarness')).reactHooks);
const api=vi.hoisted(()=>({owner:'85000000-0000-4000-8000-000000000001',invoke:vi.fn(),rpc:vi.fn(),put:vi.fn(),refresh:vi.fn()}));
vi.mock('../../src/lib/supabase',()=>({supabase:{auth:{getSession:async()=>({data:{session:{user:{id:api.owner}}},error:null})},functions:{invoke:(...a:unknown[])=>api.invoke(...a)},rpc:(...a:unknown[])=>api.rpc(...a)}}));
const file=new File([new Uint8Array(10)],'avatar.jpg',{type:'image/jpeg'});
beforeEach(()=>{const map=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>map.set(k,v),get length(){return map.size;},key:(i:number)=>[...map.keys()][i]??null});
  api.owner='85000000-0000-4000-8000-000000000001';api.invoke.mockReset().mockImplementation(async(name,{body})=>({error:null,data:name==='r2-presign'?{protocolVersion:2,key:`coach-image/${body.ownerId}/${body.operationId}`,uploadUrl:'https://fixture.test',uploadHeaders:{'Content-Type':file.type,'If-None-Match':'*'}}:{key:body.key,ready:true}}));
  api.rpc.mockReset().mockImplementation(async(_name,p)=>({data:p.p_owner_id,error:null}));api.put.mockReset().mockResolvedValue({ok:true});api.refresh.mockReset().mockResolvedValue(undefined);vi.stubGlobal('fetch',api.put);});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('coalesces taps and resumes uncertain avatar confirmation with the same operation after remount',async()=>{
  const wait=deferred<{ok:boolean}>();api.put.mockReturnValueOnce(wait.promise);api.rpc.mockResolvedValueOnce({data:null,error:{message:'Lost response'}});
  const hook=new HookHarness(()=>useAvatarUpload(api.owner,null,api.refresh));const first=hook.current.uploadAvatar(file);await settle();await hook.current.uploadAvatar(file);expect(api.put).toHaveBeenCalledTimes(1);
  wait.resolve({ok:true});await first;await settle();expect(hook.current.avatarError).toBe('Lost response');const operation=hook.current.avatarUploads[0].operation;hook.unmount();
  const reopened=new HookHarness(()=>useAvatarUpload(api.owner,null,api.refresh));await settle();await reopened.current.resumeAvatar(operation);await settle();
  expect(api.rpc.mock.calls[1]).toEqual(api.rpc.mock.calls[0]);expect(api.put).toHaveBeenCalledTimes(1);expect(reopened.current.avatarUploads[0].phase).toBe('applied');
});
it('account change during PUT prevents finalization and avatar mutation',async()=>{
  const owner=api.owner;const hook=new HookHarness(()=>useAvatarUpload(owner,null,api.refresh));api.put.mockImplementationOnce(async()=>{api.owner='other';return {ok:true};});
  await hook.current.uploadAvatar(file);await settle();expect(api.invoke.mock.calls.map(([name])=>name)).toEqual(['r2-presign']);expect(api.rpc).not.toHaveBeenCalled();expect(hook.current.avatarError).toContain('original account');
});
