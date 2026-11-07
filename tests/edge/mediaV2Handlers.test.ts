import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {expect,it,vi} from 'vitest';
const owner='84000000-0000-4000-8000-000000000001',operation='84000000-0000-4000-8000-000000000002';
const key=`coach-image/${owner}/${operation}`;
const upload={kind:'coach-image',filename:'avatar.jpg',contentType:'image/jpeg',sizeBytes:8,protocolVersion:2,operationId:operation,ownerId:owner};
type Handler=(request:Request)=>Promise<Response>;
function load(name:'r2-presign'|'r2-get-url'|'r2-finalize',options:{foreign?:boolean;revoked?:boolean;invalidBytes?:boolean;missing?:boolean;wrongReceipt?:boolean;protocol?:number}={}){
  let handler:Handler|undefined;let ready=false;
  const row={object_key:key,owner_id:options.foreign?'other-owner':owner,kind:'coach-image',content_type:'image/jpeg',declared_size_bytes:8,
    protocol_version:options.protocol??2,state:'pending',verified_key:null as string|null,actual_size_bytes:null as number|null,actual_content_type:null as string|null,verified_etag:null as string|null};
  const eq=vi.fn((_column:string,_value:unknown)=>query);
  const query={select:()=>query,eq,maybeSingle:async()=>({data:options.missing?null:row,error:null}),insert:async()=>({error:null})};
  const rpc=vi.fn(async(name:string,args:Record<string,unknown>)=>{
    if(name==='register_media_upload')return {data:options.wrongReceipt?'foreign/key':`${args.p_kind}/${args.p_owner_id}/${args.p_operation_id}`,error:null};
    if(name==='can_access_media_identity')return {data:!options.missing&&!options.foreign,error:null};
    if(name==='can_view_media')return {data:ready&&!options.revoked,error:null};
    if(name==='mark_media_ready'){
      ready=true;Object.assign(row,{state:'ready',verified_key:args.p_verified_key,actual_size_bytes:args.p_size_bytes,actual_content_type:args.p_content_type,verified_etag:args.p_etag});
      return {data:args.p_verified_key,error:null};
    }
    throw new Error('Unexpected registry call');
  });
  const client=vi.fn(()=>({auth:{getUser:async()=>({data:{user:{id:owner}},error:null})},from:()=>query,rpc}));
  const sign=vi.fn(async(url:string,_init:unknown)=>({url}));
  const objects=new Map<string,{etag:string;bytes:Uint8Array}>([[key,{etag:'"source"',bytes:options.invalidBytes?new Uint8Array(8):new Uint8Array([255,216,255,224,0,2,0,0])}]]);
  const fetchObject=vi.fn(async(url:string,init:RequestInit)=>{
    const objectKey=decodeURIComponent(new URL(url).pathname.slice('/fixture-R2_BUCKET/'.length));const object=objects.get(objectKey);
    if(init.method==='HEAD')return object?new Response(null,{headers:{'content-length':'8','content-type':'image/jpeg',etag:object.etag}}):new Response(null,{status:404});
    if(init.method==='GET')return new Response(object!.bytes,{status:206,headers:{'content-range':'bytes 0-7/8'}});
    if(init.method==='PUT'){const headers=new Headers(init.headers);expect(headers.get('cf-copy-destination-if-none-match')).toBe('*');expect(headers.get('x-amz-copy-source-if-match')).toBe('"source"');objects.set(objectKey,{...objects.get(key)!,etag:'"sealed"'});return new Response('<CopyObjectResult/>');}
    throw new Error('Unexpected S3 operation');
  });
  function module(file:string):Record<string,unknown>{
    const target={exports:{}};const output=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},fileName:file}).outputText;
    runInNewContext(output,{module:target,exports:target.exports,Request,Response,Headers,crypto,AbortSignal,TextEncoder,TextDecoder,
      Deno:{serve:(fn:Handler)=>{handler=fn;},env:{get:(name:string)=>`fixture-${name}`}},require:(specifier:string)=>{
        if(specifier==='jsr:@supabase/supabase-js@2')return {createClient:client};
        if(specifier==='https://esm.sh/aws4fetch@1.0.20')return {AwsClient:class{sign=sign;fetch=fetchObject;}};
        if(specifier.startsWith('../_shared/')||specifier.startsWith('./'))return module(resolve(dirname(file),specifier));
        throw new Error('Unexpected import');
      }},{filename:file});return target.exports;
  }
  module(resolve('supabase/functions',name,'index.ts'));if(!handler)throw new Error('Missing handler');
  return {handler,rpc,eq,sign,client,fetchObject,row};
}
const request=(body:unknown)=>new Request('https://fixture.test',{method:'POST',headers:{Authorization:'Bearer fixture'},body:JSON.stringify(body)});
it('V2 registration and PUT signatures bind exact owner/operation/type and create-once headers',async()=>{
  const h=load('r2-presign');const response=await h.handler(request(upload));expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({key,protocolVersion:2,uploadHeaders:{'Content-Type':'image/jpeg','If-None-Match':'*'}});
  expect(h.rpc).toHaveBeenCalledWith('register_media_upload',{p_owner_id:owner,p_operation_id:operation,p_kind:'coach-image',p_content_type:'image/jpeg',p_size_bytes:8});
  expect(h.sign).toHaveBeenCalledWith(expect.stringContaining(key),{method:'PUT',headers:{'Content-Type':'image/jpeg','If-None-Match':'*'},aws:{signQuery:true,allHeaders:true}});
});
it.each([{ownerId:'other'},{operationId:'not-a-uuid'},{protocolVersion:3},{sizeBytes:0.5}])('rejects a malformed V2 identity/manifest before registration or signing: %j',async(patch)=>{
  const h=load('r2-presign');expect((await h.handler(request({...upload,...patch}))).status).toBe(400);expect(h.rpc).not.toHaveBeenCalled();expect(h.sign).not.toHaveBeenCalled();
});
it('does not sign an unexpected registry key',async()=>{const h=load('r2-presign',{wrongReceipt:true});expect((await h.handler(request(upload))).status).toBe(500);expect(h.sign).not.toHaveBeenCalled();});
it('finalizes owned stored bytes and only then reports readiness',async()=>{
  const h=load('r2-finalize');const response=await h.handler(request({key,ownerId:owner}));expect(response.status).toBe(200);expect(await response.json()).toEqual({key,ready:true});
  expect(h.eq).toHaveBeenCalledWith('owner_id',owner);expect(h.rpc).toHaveBeenCalledWith('mark_media_ready',{p_key:key,p_verified_key:key,p_size_bytes:8,p_content_type:'image/jpeg',p_etag:'"source"'});
  expect(h.sign).not.toHaveBeenCalled();
});
it.each([{foreign:true},{missing:true}])('denies an unowned/unregistered finalization before accessing storage: %j',async(options)=>{
  const h=load('r2-finalize',options);expect((await h.handler(request({key,ownerId:owner}))).status).toBe(403);expect(h.fetchObject).not.toHaveBeenCalled();expect(h.rpc).not.toHaveBeenCalled();
});
it('keeps failed verification pending and exposes bounded CORS errors',async()=>{
  const h=load('r2-finalize',{invalidBytes:true});const response=await h.handler(request({key,ownerId:owner}));expect(response.status).toBe(409);
  expect(response.headers.get('access-control-allow-origin')).toBe('*');expect(await response.json()).toEqual({error:'Upload could not be verified. Retry or choose another file.'});
  expect(h.rpc).not.toHaveBeenCalledWith('mark_media_ready',expect.anything());expect(h.row.state).toBe('pending');
});
it('rechecks the current relationship after verification and never issues a revoked viewer URL',async()=>{
  const h=load('r2-get-url',{revoked:true});expect((await h.handler(request({key}))).status).toBe(403);
  expect(h.rpc).toHaveBeenCalledWith('mark_media_ready',expect.anything());expect(h.rpc).toHaveBeenLastCalledWith('can_view_media',{p_key:key});expect(h.sign).not.toHaveBeenCalled();
});
it('registered V1 playback signs the verified sealed destination instead of the reusable PUT key',async()=>{
  const h=load('r2-get-url',{protocol:1});const response=await h.handler(request({key}));expect(response.status).toBe(200);
  const result=await response.json();expect(result.url).toMatch(/\/sealed\/[a-f0-9]{64}\?X-Amz-Expires=600$/);expect(result.url).not.toContain(key);
  expect(h.fetchObject.mock.calls.filter(([,init])=>init.method==='PUT')).toHaveLength(1);
});
