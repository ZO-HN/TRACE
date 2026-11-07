import {mediaPolicy} from './mediaPolicy.ts';
export interface MediaObject {
  object_key:string;owner_id:string;kind:string;content_type:string;declared_size_bytes:number;
  protocol_version:number;state:string;verified_key:string|null;actual_size_bytes:number|null;
  actual_content_type:string|null;verified_etag:string|null;
}
interface Verified {key:string;size:number;contentType:string;etag:string}
export interface VerifyContext {
  endpoint:(key:string)=>string;bucket:string;
  fetch:(url:string,init:RequestInit)=>Promise<Response>;
  markReady:(metadata:Verified)=>Promise<string>;
}
const hasControl=(value:string)=>Array.from(value).some(char=>char.charCodeAt(0)<32||char.charCodeAt(0)===127);
export function objectPath(key:string){
  if(!key||key.length>1024||hasControl(key)||key.split('/').some(part=>!part||part==='.'||part==='..'))throw new Error('Invalid object identity');
  return key.split('/').map(encodeURIComponent).join('/');
}
export async function sealedMediaKey(key:string){
  const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key)));
  return 'sealed/'+Array.from(hash,byte=>byte.toString(16).padStart(2,'0')).join('');
}
// A bounded container-signature check, not a full decoder or malware scanner.
export function matchesMediaSignature(type:string,bytes:Uint8Array){
  const starts=(values:number[])=>values.every((value,index)=>bytes[index]===value);
  const ascii=(start:number,length:number)=>String.fromCharCode(...bytes.slice(start,start+length));
  if(type==='image/jpeg')return starts([255,216,255]);
  if(type==='image/png')return starts([137,80,78,71,13,10,26,10]);
  if(type==='image/webp')return bytes.length>=12&&ascii(0,4)==='RIFF'&&ascii(8,4)==='WEBP';
  if(type==='application/pdf')return ascii(0,5)==='%PDF-';
  if(type==='video/webm')return starts([26,69,223,163])&&new TextDecoder().decode(bytes).includes('webm');
  if(type==='image/heic')return bytes.length>=12&&ascii(4,4)==='ftyp'&&['heic','heix','hevc','hevx','mif1','msf1'].includes(ascii(8,4));
  if(type==='video/quicktime')return bytes.length>=12&&((ascii(4,4)==='ftyp'&&ascii(8,4)==='qt  ')||['moov','mdat','wide'].includes(ascii(4,4)));
  if(type==='video/mp4')return bytes.length>=12&&ascii(4,4)==='ftyp'&&['isom','iso2','iso3','iso4','iso5','iso6','mp41','mp42','avc1','M4V ','MSNV','dash'].includes(ascii(8,4));
  return false;
}
async function readBounded(response:Response,limit:number){
  if(!response.body)throw new Error('Object bytes unavailable');
  const reader=response.body.getReader();const chunks:Uint8Array[]=[];let size=0;
  try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>limit)throw new Error('Response exceeded verification bound');chunks.push(part.value);}}
  finally{await reader.cancel().catch(()=>undefined);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes;
}
function request(context:VerifyContext,key:string,init:RequestInit){return context.fetch(context.endpoint(key),{...init,signal:AbortSignal.timeout(15000)});}
function headMetadata(row:MediaObject,key:string,head:Response):Verified{
  if(head.status!==200)throw new Error('Uploaded object is not ready');
  const size=Number(head.headers.get('content-length'));const type=(head.headers.get('content-type')??'').split(';')[0].trim().toLowerCase();
  const etag=head.headers.get('etag')??'';const policy=mediaPolicy(row.kind);
  if(!policy||!Number.isSafeInteger(size)||size<=0||size!==Number(row.declared_size_bytes)||size>policy.maxBytes
    ||type!==row.content_type||!policy.contentTypes.includes(type)||!etag||etag.length>200||hasControl(etag))throw new Error('Stored media does not match its manifest');
  return {key,size,contentType:type,etag};
}
async function inspect(context:VerifyContext,row:MediaObject,key:string,head:Response):Promise<Verified>{
  const metadata=headMetadata(row,key,head);const {size,contentType:type,etag}=metadata;
  const last=Math.min(size-1,4095);
  const prefix=await request(context,key,{method:'GET',headers:{Range:`bytes=0-${last}`,'If-Match':etag}});
  if(prefix.status!==206||prefix.headers.get('content-range')!==`bytes 0-${last}/${size}`){await prefix.body?.cancel().catch(()=>undefined);throw new Error('Conditional range verification unavailable');}
  const bytes=await readBounded(prefix,4096);
  if(bytes.length!==last+1||!matchesMediaSignature(type,bytes))throw new Error('Stored media signature does not match its type');
  return metadata;
}
export async function verifyMedia(row:MediaObject,context:VerifyContext):Promise<string>{
  if(!row||![1,2].includes(row.protocol_version))throw new Error('Unsupported upload protocol');
  const canonical=row.protocol_version===2?row.object_key:await sealedMediaKey(row.object_key);
  if(row.state==='ready'){
    if(row.verified_key!==canonical||row.actual_size_bytes!==Number(row.declared_size_bytes)||row.actual_content_type!==row.content_type||!row.verified_etag)throw new Error('Invalid ready registry state');
    const head=await request(context,canonical,{method:'HEAD',headers:{'If-Match':row.verified_etag}});
    if(headMetadata(row,canonical,head).etag!==row.verified_etag)throw new Error('Verified object changed');
    return canonical;
  }
  if(row.state!=='pending')throw new Error('Media verification unavailable');
  let head=await request(context,canonical,{method:'HEAD'});
  if(row.protocol_version===1&&head.status===404){
    const sourceHead=await request(context,row.object_key,{method:'HEAD'});
    const source=await inspect(context,row,row.object_key,sourceHead);
    const copy=await request(context,canonical,{method:'PUT',headers:{
      'x-amz-copy-source':`/${encodeURIComponent(context.bucket)}/${objectPath(row.object_key)}`,
      'x-amz-copy-source-if-match':source.etag,'cf-copy-destination-if-none-match':'*',
    }});
    // R2 destination conditions are beta. Unsupported/failed operations never
    // fall back to signing the mutable source or streaming a full video.
    if(!copy.ok&&copy.status!==412){await copy.body?.cancel().catch(()=>undefined);throw new Error('Immutable object sealing unavailable');}
    const text=copy.body?new TextDecoder().decode(await readBounded(copy,16384)):'';
    if(copy.ok&&text.includes('<Error>'))throw new Error('Immutable object sealing failed');
    head=await request(context,canonical,{method:'HEAD'});
  }
  const verified=await inspect(context,row,canonical,head);
  const saved=await context.markReady(verified);
  if(saved!==canonical)throw new Error('Media verification receipt mismatch');
  return canonical;
}
