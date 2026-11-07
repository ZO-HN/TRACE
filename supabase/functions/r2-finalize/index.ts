import {createClient} from 'jsr:@supabase/supabase-js@2';
import {AwsClient} from 'https://esm.sh/aws4fetch@1.0.20';
import {corsHeaders as CORS} from '../_shared/cors.ts';
import {objectPath,verifyMedia,type MediaObject} from '../_shared/verifyMedia.ts';
const json=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers:{...CORS,'Content-Type':'application/json'}});
Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:CORS});
  if(req.method!=='POST')return json(405,{error:'Method not allowed'});
  const jwt=(req.headers.get('Authorization')??'').replace('Bearer ','');if(!jwt)return json(401,{error:'Missing authorization'});
  try{
    const url=Deno.env.get('SUPABASE_URL'),anonKey=Deno.env.get('SUPABASE_ANON_KEY');
    if(!url?.trim()||!anonKey?.trim())return json(500,{error:'Could not process request'});
    const asUser=createClient(url,anonKey,{global:{headers:{Authorization:`Bearer ${jwt}`}}});
    const auth=await asUser.auth.getUser();if(auth.error||!auth.data.user)return json(401,{error:'Invalid token'});
    let body:unknown;try{body=await req.json();}catch{return json(400,{error:'Invalid JSON body'});}
    if(!body||typeof body!=='object'||Array.isArray(body))return json(400,{error:'Expected a JSON object'});
    const {key,ownerId}=body as Record<string,unknown>;
    if(typeof key!=='string'||!key.trim()||ownerId!==auth.data.user.id)return json(400,{error:'A key and matching captured owner are required'});
    const accountId=Deno.env.get('R2_ACCOUNT_ID'),bucket=Deno.env.get('R2_BUCKET'),accessKeyId=Deno.env.get('R2_ACCESS_KEY_ID'),secretAccessKey=Deno.env.get('R2_SECRET_ACCESS_KEY'),serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if(!accountId?.trim()||!bucket?.trim()||!accessKeyId?.trim()||!secretAccessKey?.trim()||!serviceKey?.trim())return json(500,{error:'Could not process request'});
    const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const registered=await admin.from('media_objects').select('object_key,owner_id,kind,content_type,declared_size_bytes,protocol_version,state,verified_key,actual_size_bytes,actual_content_type,verified_etag').eq('object_key',key).eq('owner_id',auth.data.user.id).maybeSingle();
    if(registered.error)return json(500,{error:'Could not process request'});
    if(!registered.data||registered.data.owner_id!==auth.data.user.id)return json(403,{error:'Not authorized for this object'});
    const aws=new AwsClient({accessKeyId,secretAccessKey,service:'s3',region:'auto'});
    try{
      await verifyMedia(registered.data as MediaObject,{bucket,endpoint:objectKey=>`https://${accountId}.r2.cloudflarestorage.com/${bucket}/${objectPath(objectKey)}`,fetch:(input,init)=>aws.fetch(input,init),markReady:async metadata=>{
        const saved=await admin.rpc('mark_media_ready',{p_key:key,p_verified_key:metadata.key,p_size_bytes:metadata.size,p_content_type:metadata.contentType,p_etag:metadata.etag});
        if(saved.error||typeof saved.data!=='string')throw new Error('Media verification failed');return saved.data;
      }});
    }catch{return json(409,{error:'Upload could not be verified. Retry or choose another file.'});}
    return json(200,{key,ready:true});
  }catch{return json(500,{error:'Could not process request'});}
});
