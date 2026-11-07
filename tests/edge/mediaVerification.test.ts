import {expect,it,vi} from 'vitest';
import {matchesMediaSignature,objectPath,sealedMediaKey,verifyMedia,type MediaObject,type VerifyContext} from '../../supabase/functions/_shared/verifyMedia';
const jpeg=new Uint8Array([255,216,255,224,0,2,0,0]);
type ObjectData={bytes:Uint8Array;type:string;etag:string};
function setup(version=2){
  const key='coach-image/owner/original';
  const row:MediaObject={object_key:key,owner_id:'owner',kind:'coach-image',content_type:'image/jpeg',declared_size_bytes:jpeg.length,protocol_version:version,state:'pending',verified_key:null,actual_size_bytes:null,actual_content_type:null,verified_etag:null};
  const objects=new Map<string,ObjectData>([[key,{bytes:jpeg,type:'image/jpeg',etag:'"source"'}]]);
  const markReady=vi.fn(async(metadata:{key:string})=>metadata.key);
  const transport=vi.fn(async(url:string,init:RequestInit)=>{
    const objectKey=decodeURIComponent(new URL(url).pathname.slice('/bucket/'.length));const data=objects.get(objectKey);const headers=new Headers(init.headers);
    if(init.method==='HEAD')return data?new Response(null,{headers:{'content-length':String(data.bytes.length),'content-type':data.type,etag:data.etag}}):new Response(null,{status:404});
    if(init.method==='GET'){
      if(!data)return new Response(null,{status:404});if(headers.get('if-match')!==data.etag)return new Response(null,{status:412});
      const end=Math.min(data.bytes.length-1,4095);expect(headers.get('range')).toBe(`bytes=0-${end}`);
      return new Response(data.bytes.slice(0,end+1),{status:206,headers:{'content-range':`bytes 0-${end}/${data.bytes.length}`}});
    }
    if(init.method==='PUT'){
      expect(headers.get('cf-copy-destination-if-none-match')).toBe('*');expect(headers.get('x-amz-copy-source')).toBe(`/bucket/${key}`);
      const source=objects.get(key)!;if(data||headers.get('x-amz-copy-source-if-match')!==source.etag)return new Response(null,{status:412});
      objects.set(objectKey,{...source,etag:'"sealed"'});return new Response('<CopyObjectResult/>');
    }
    throw new Error('Unexpected object request');
  });
  const context:VerifyContext={bucket:'bucket',endpoint:k=>`https://fixture.test/bucket/${objectPath(k)}`,fetch:transport,markReady};
  return {row,objects,context,transport,markReady};
}
it('binds HEAD metadata and a conditional bounded range before marking a V2 object ready',async()=>{
  const h=setup();expect(await verifyMedia(h.row,h.context)).toBe(h.row.object_key);
  expect(h.markReady).toHaveBeenCalledWith({key:h.row.object_key,size:8,contentType:'image/jpeg',etag:'"source"'});
  expect(new Headers(h.transport.mock.calls[1][1].headers).get('if-match')).toBe('"source"');expect(h.transport.mock.calls.every(([,init])=>Boolean(init.signal))).toBe(true);
});
it.each(['size','type','signature','missing'] as const)('never marks an object ready after %s mismatch',async(kind)=>{
  const h=setup();if(kind==='size')h.row.declared_size_bytes=9;
  if(kind==='type')h.objects.get(h.row.object_key)!.type='text/html';
  if(kind==='signature')h.objects.get(h.row.object_key)!.bytes=new Uint8Array(8);
  if(kind==='missing')h.objects.clear();await expect(verifyMedia(h.row,h.context)).rejects.toThrow();expect(h.markReady).not.toHaveBeenCalled();
});
it('rejects ignored range responses and changed ETags without consuming a whole video',async()=>{
  for(const status of [200,412]){
    const h=setup();const original=h.context.fetch;let cancelled=false;
    h.context.fetch=(url,init)=>init.method==='GET'?Promise.resolve(new Response(new ReadableStream({cancel(){cancelled=true;}}),{status})):original(url,init);
    await expect(verifyMedia(h.row,h.context)).rejects.toThrow('range verification');expect(cancelled).toBe(true);expect(h.markReady).not.toHaveBeenCalled();
  }
});
it('rejects oversized or truncated conditional-range bodies even with convincing metadata',async()=>{
  for(const bytes of [new Uint8Array(4097),jpeg.slice(0,3)]){
    const h=setup();const original=h.context.fetch;h.context.fetch=(url,init)=>init.method==='GET'?Promise.resolve(new Response(bytes,{status:206,headers:{'content-range':'bytes 0-7/8'}})):original(url,init);
    await expect(verifyMedia(h.row,h.context)).rejects.toThrow();expect(h.markReady).not.toHaveBeenCalled();
  }
});
it('seals a registered V1 upload once and reuses the immutable destination despite later source writes',async()=>{
  const h=setup(1);const canonical=await sealedMediaKey(h.row.object_key);
  expect(await verifyMedia(h.row,h.context)).toBe(canonical);expect(h.transport.mock.calls.filter(([,init])=>init.method==='PUT')).toHaveLength(1);
  h.objects.get(h.row.object_key)!.bytes=new Uint8Array(8);h.objects.get(h.row.object_key)!.etag='"later-write"';
  expect(await verifyMedia(h.row,h.context)).toBe(canonical);expect(h.transport.mock.calls.filter(([,init])=>init.method==='PUT')).toHaveLength(1);
  expect(h.markReady.mock.calls[1][0]).toMatchObject({key:canonical,etag:'"sealed"'});
});
it('fails closed if conditional legacy copy is unsupported, embeds an error or never commits',async()=>{
  for(const response of [()=>new Response('unsupported',{status:501}),()=>new Response('<Error>copy failed</Error>'),()=>new Response(null,{status:412})]){
    const h=setup(1);const original=h.context.fetch;h.context.fetch=(url,init)=>init.method==='PUT'?Promise.resolve(response()):original(url,init);
    await expect(verifyMedia(h.row,h.context)).rejects.toThrow();expect(h.markReady).not.toHaveBeenCalled();
  }
});
it('retains missing-key uncertainty and rejects a mismatched verification receipt or invalid ready row',async()=>{
  const h=setup();h.markReady.mockResolvedValueOnce('foreign-key');await expect(verifyMedia(h.row,h.context)).rejects.toThrow('receipt mismatch');
  h.row.state='ready';h.row.verified_key='foreign-key';await expect(verifyMedia(h.row,h.context)).rejects.toThrow('registry');
  h.row.state='pending';h.objects.clear();await expect(verifyMedia(h.row,h.context)).rejects.toThrow('not ready');
  expect(h.transport.mock.calls.filter(([,init])=>init.method==='PUT')).toHaveLength(0);
});
it('checks ready-object existence/ETag without rereading its body or rebinding a missing/replaced object',async()=>{
  const h=setup();Object.assign(h.row,{state:'ready',verified_key:h.row.object_key,actual_size_bytes:8,actual_content_type:'image/jpeg',verified_etag:'"source"'});
  expect(await verifyMedia(h.row,h.context)).toBe(h.row.object_key);expect(h.transport).toHaveBeenCalledTimes(1);expect(h.transport.mock.calls[0][1].method).toBe('HEAD');
  h.objects.get(h.row.object_key)!.etag='"changed"';await expect(verifyMedia(h.row,h.context)).rejects.toThrow('changed');
  h.objects.clear();await expect(verifyMedia(h.row,h.context)).rejects.toThrow('not ready');expect(h.markReady).not.toHaveBeenCalled();
});
it.each([
  ['image/jpeg',jpeg],['image/png',new Uint8Array([137,80,78,71,13,10,26,10])],
  ['image/webp',new TextEncoder().encode('RIFFxxxxWEBP')],['application/pdf',new TextEncoder().encode('%PDF-1.7')],
  ['video/mp4',new TextEncoder().encode('xxxxftypisom')],['video/quicktime',new TextEncoder().encode('xxxxftypqt  ')],
  ['image/heic',new TextEncoder().encode('xxxxftypheic')],['video/webm',new Uint8Array([26,69,223,163,...new TextEncoder().encode('webm')])],
] as const)('checks the supported %s container prefix without accepting empty/random bytes', (type,bytes)=>{
  expect(matchesMediaSignature(type,bytes)).toBe(true);expect(matchesMediaSignature(type,new Uint8Array(32))).toBe(false);expect(matchesMediaSignature(type,new Uint8Array())).toBe(false);
});
