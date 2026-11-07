import {expect,it,vi} from 'vitest';
import {finishAvatarJob,listAvatarJobs,readAvatarJob,writeAvatarJob,type AvatarJob,type AvatarTransport} from '../../src/lib/storage/avatarUpload';
const owner='84000000-0000-4000-8000-000000000001',operation='84000000-0000-4000-8000-000000000002';
const key=`coach-image/${owner}/${operation}`;
const file=new File([new Uint8Array(10)],'avatar.jpg',{type:'image/jpeg'});
const job=():AvatarJob=>({version:2,owner,operation,name:file.name,type:file.type,size:file.size,expectedKey:null,phase:'prepared',createdAt:'2026-11-08'});
function transport(){return {
  assertOwner:vi.fn<AvatarTransport['assertOwner']>().mockResolvedValue(undefined),
  presign:vi.fn<AvatarTransport['presign']>().mockResolvedValue({protocolVersion:2,key,uploadUrl:'https://fixture.test/put',uploadHeaders:{'Content-Type':file.type,'If-None-Match':'*'}}),
  put:vi.fn<AvatarTransport['put']>().mockResolvedValue(undefined),finalize:vi.fn<AvatarTransport['finalize']>().mockResolvedValue(undefined),
  apply:vi.fn<AvatarTransport['apply']>().mockResolvedValue(owner),save:vi.fn<AvatarTransport['save']>(),
};}
it('journals the issued key before PUT and verification before avatar mutation',async()=>{
  const api=transport();expect((await finishAvatarJob(job(),file,api)).phase).toBe('applied');
  expect(api.save.mock.calls.map(([j])=>j.phase)).toEqual(['issued','ready','applied']);
  expect(api.save.mock.invocationCallOrder[0]).toBeLessThan(api.put.mock.invocationCallOrder[0]);
  expect(api.finalize.mock.invocationCallOrder[0]).toBeLessThan(api.apply.mock.invocationCallOrder[0]);
  expect(api.apply.mock.calls[0][0]).toMatchObject({operation,expectedKey:null,key});
});
it('handles lost PUT and write-once rejection by verifying that same issued key',async()=>{
  const api=transport();api.put.mockRejectedValueOnce(new Error('412 / lost response'));
  await finishAvatarJob(job(),file,api);expect(api.presign).toHaveBeenCalledTimes(1);expect(api.finalize).toHaveBeenCalledWith(key,owner);
});
it('recovers already uploaded bytes after reload without a File, and does not reapply a completed job',async()=>{
  const api=transport();const ready={...job(),key,phase:'ready' as const};
  await finishAvatarJob(ready,undefined,api);expect(api.put).not.toHaveBeenCalled();expect(api.presign).not.toHaveBeenCalled();
  api.apply.mockClear();await finishAvatarJob({...ready,phase:'applied'},undefined,api);expect(api.apply).not.toHaveBeenCalled();
});
it('retains exact metadata after uncertain apply, rejects changed file and fails closed on verification',async()=>{
  const api=transport();api.apply.mockRejectedValueOnce(new Error('Reply lost'));
  await expect(finishAvatarJob(job(),file,api)).rejects.toThrow('Reply lost');const held=api.save.mock.calls.at(-1)![0];
  await finishAvatarJob(held,undefined,api);expect(api.apply.mock.calls[1]).toEqual(api.apply.mock.calls[0]);
  const invalid=transport();invalid.finalize.mockRejectedValueOnce(new Error('Bad bytes'));
  await expect(finishAvatarJob(job(),file,invalid)).rejects.toThrow('Bad bytes');expect(invalid.apply).not.toHaveBeenCalled();
  await expect(finishAvatarJob(job(),new File(['changed'],'other.jpg',{type:file.type}),transport())).rejects.toThrow('different selected');
});
it('stops before mutation on account change or failed journal persistence',async()=>{
  const api=transport();let changed=false;api.put.mockImplementationOnce(async()=>{changed=true;});api.assertOwner.mockImplementation(async()=>{if(changed)throw new Error('Changed account');});
  await expect(finishAvatarJob(job(),file,api)).rejects.toThrow('Changed account');expect(api.finalize).not.toHaveBeenCalled();expect(api.apply).not.toHaveBeenCalled();
  const disk=transport();disk.save.mockImplementationOnce(()=>{throw new Error('Disk full');});await expect(finishAvatarJob(job(),file,disk)).rejects.toThrow('Disk full');expect(disk.put).not.toHaveBeenCalled();
});
it('uses per-owner metadata records, keeps corruption, and never stores image bytes',()=>{
  const map=new Map<string,string>();const storage={getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v);},get length(){return map.size;},key:(n:number)=>[...map.keys()][n]??null} as Storage;
  writeAvatarJob(storage,job());expect(readAvatarJob(storage,owner,operation)).toEqual(job());expect(listAvatarJobs(storage,'other')).toEqual([]);
  expect([...map.values()][0]).not.toContain('base64');map.set([...map.keys()][0],'{broken');expect(()=>listAvatarJobs(storage,owner)).toThrow();expect(map.size).toBe(1);
});
