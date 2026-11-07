import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {supabase} from '../lib/supabase';
import type {Database} from '../lib/database.types';
export interface ProgramSlot {id:string;offset:number;label:string;template_id:string|null}
type Delivery=Database['public']['Tables']['coach_program_deliveries']['Row'];
type SaveArgs=Database['public']['Functions']['save_coach_program']['Args'];
type DeliveryArgs=Database['public']['Functions']['set_coach_program_delivery']['Args'];
type Write={kind:'save';args:SaveArgs}|{kind:'delivery';args:DeliveryArgs};
export function useCoachProgramEditor(coachId:string,programId:string){
  const key=`${coachId}:${programId}`;
  const owner=useRef(key);owner.current=key;
  const scope=useMemo(()=>({key,alive:false,version:0,pending:null as Write|null,flight:null as Promise<boolean>|null}),[key]);
  const [state,setState]=useState({key,loading:true,error:null as string|null,revision:0,slots:[] as ProgramSlot[],deliveries:[] as Delivery[]});
  const [write,setWrite]=useState({key,busy:false,pending:false,error:null as string|null});
  const refresh=useCallback(async()=>{
    if(!scope.alive||owner.current!==key)return;
    const version=++scope.version;const current=()=>scope.alive&&owner.current===key&&scope.version===version;
    setState(s=>({...s,...(s.key===key?{}:{revision:0,slots:[],deliveries:[]}),key,loading:true,error:null}));
    try{
      const head=await supabase.from('coach_program_heads').select('revision,slots').eq('coach_id',coachId).eq('program_id',programId).maybeSingle();
      if(head.error)throw new Error(head.error.message);
      const slots=(head.data?.slots??[]) as unknown as ProgramSlot[];
      if(!Array.isArray(slots))throw new Error('Invalid program definition. Contact support.');
      const deliveries:Delivery[]=[];
      for(let offset=0;;offset+=200){
        if(!current())return;
        const result=await supabase.from('coach_program_deliveries').select('id,coach_id,program_id,trainee_id,group_id,start_date,active,revision')
          .eq('coach_id',coachId).order('id').range(offset,offset+199);
        if(result.error)throw new Error(result.error.message);deliveries.push(...(result.data??[]));
        if(!result.data||result.data.length<200)break;
      }
      if(current())setState({key,loading:false,error:null,revision:head.data?.revision??0,slots,deliveries});
    }catch(cause){if(current())setState(s=>({...s,key,loading:false,error:cause instanceof Error?cause.message:'Could not load program.'}));}
  },[scope,key,coachId,programId]);
  useEffect(()=>{scope.alive=true;void refresh();return()=>{scope.alive=false;};},[scope,refresh]);
  const run=(request?:Write):Promise<boolean>=>{
    if(!scope.alive||owner.current!==key)return Promise.resolve(false);
    if(scope.flight)return scope.flight;
    if(scope.pending&&request){setWrite({key,busy:false,pending:true,error:'Retry the unchanged pending operation first.'});return Promise.resolve(false);}
    scope.pending??=request??null;if(!scope.pending)return Promise.resolve(false);
    const captured=scope.pending;const current=()=>scope.alive&&owner.current===key;
    setWrite({key,busy:true,pending:true,error:null});
    const flight=Promise.resolve().then(async()=>{
      if(!current())return false;
      try{
        const result=captured.kind==='save'?await supabase.rpc('save_coach_program',captured.args):await supabase.rpc('set_coach_program_delivery',captured.args);
        if(result.error){
          // A returned PostgreSQL error rolled the RPC transaction back. A
          // transport/unknown receipt retains the original operation identity.
          if(/^[0-9A-Z]{5}$/.test(result.error.code??''))scope.pending=null;
          throw new Error(result.error.message);
        }
        if(result.data!==captured.args.p_expected_revision+1)throw new Error('Unknown program outcome. Retry unchanged.');
        scope.pending=null;if(current())setWrite({key,busy:false,pending:false,error:null});
        if(current())await refresh();return current();
      }catch(cause){if(current())setWrite({key,busy:false,pending:Boolean(scope.pending),error:cause instanceof Error?cause.message:'Could not save program.'});return false;}
    });scope.flight=flight;void flight.finally(()=>{if(scope.flight===flight)scope.flight=null;});return flight;
  };
  return {...(state.key===key?state:{key,loading:true,error:null,revision:0,slots:[],deliveries:[]}),
    busy:write.key===key&&write.busy,pending:write.key===key&&write.pending,writeError:write.key===key?write.error:null,refresh,
    save:(revision:number,slots:ProgramSlot[])=>run({kind:'save',args:{p_operation_id:crypto.randomUUID(),p_program_id:programId,p_coach_id:coachId,p_expected_revision:revision,p_slots:slots.map(slot=>({...slot}))}}),
    deliver:(args:Omit<DeliveryArgs,'p_operation_id'|'p_coach_id'|'p_program_id'>)=>run({kind:'delivery',args:{...args,p_operation_id:crypto.randomUUID(),p_coach_id:coachId,p_program_id:programId}}),retry:()=>run()};
}
