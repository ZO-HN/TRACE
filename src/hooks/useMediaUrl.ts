import {useCallback,useEffect,useRef,useState} from 'react';
import {supabase} from '../lib/supabase';
import {getMediaUrl} from '../lib/storage/getUrl';
export interface UseMediaUrl {url:string|null;contentType:string|null;loading:boolean;error:string|null;retry:()=>void}
export function useMediaUrl(key:string|null):UseMediaUrl{
  const [viewer,setViewer]=useState<string|null|undefined>(undefined);const viewerRef=useRef(viewer);viewerRef.current=viewer;
  const [attempt,setAttempt]=useState(0);const tag=JSON.stringify([viewer,key,attempt]);
  const latest=useRef(tag);latest.current=tag;
  const empty={tag,url:null as string|null,contentType:null as string|null,loading:Boolean(key),error:null as string|null};
  const [state,setState]=useState(empty);
  useEffect(()=>{
    let alive=true,version=0;
    const subscription=supabase.auth.onAuthStateChange((_event,session)=>{if(alive){++version;viewerRef.current=session?.user.id??null;setViewer(session?.user.id??null);}});
    const request=version;
    void supabase.auth.getSession().then(result=>{if(alive&&request===version){viewerRef.current=result.data.session?.user.id??null;setViewer(viewerRef.current);}})
      .catch(()=>{if(alive&&request===version){viewerRef.current=null;setViewer(null);}});
    return()=>{alive=false;subscription.data.subscription.unsubscribe();};
  },[]);
  useEffect(()=>{
    let alive=true;let timer:ReturnType<typeof setTimeout>|undefined;
    const current=()=>alive&&latest.current===tag&&viewerRef.current===viewer;
    setState({tag,url:null,contentType:null,loading:Boolean(key)&&viewer===undefined,error:null});
    if(!key||viewer===undefined)return()=>{alive=false;};
    if(!viewer){setState({tag,url:null,contentType:null,loading:false,error:'Sign in to view this media.'});return()=>{alive=false;};}
    setState({tag,url:null,contentType:null,loading:true,error:null});
    void getMediaUrl(key).then(signed=>{
      if(!current())return;
      if(typeof signed.url!=='string'||!signed.url.startsWith('https://')||!Number.isFinite(signed.expiresIn)||signed.expiresIn<1||signed.expiresIn>600)throw new Error('Invalid media link response. Retry.');
      setState({tag,url:signed.url,contentType:signed.contentType??null,loading:false,error:null});
      timer=setTimeout(()=>{if(current())setState({tag,url:null,contentType:null,loading:false,error:'Media link expired. Reload media.'});},Math.max(0,signed.expiresIn*1000-1000));
    }).catch(cause=>{if(current())setState({tag,url:null,contentType:null,loading:false,error:cause instanceof Error?cause.message:'Could not load media. Retry.'});});
    return()=>{alive=false;if(timer)clearTimeout(timer);};
  },[tag,key,viewer]);
  return {...(state.tag===tag?state:empty),retry:useCallback(()=>setAttempt(value=>value+1),[])};
}
