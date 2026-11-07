import {useEffect,useState} from 'react';
import {supabase} from '../../lib/supabase';
interface Day {program_id:string;slot_id:string;anchor_date:string;scheduled_date:string;program_name:string;label:string;rest:boolean;revision:number;source:string}
export default function ProgramCalendar({traineeId,from,to}:{traineeId:string;from:string;to:string}){
  const [attempt,setAttempt]=useState(0);
  const [state,setState]=useState({loading:true,error:null as string|null,days:[] as Day[]});
  useEffect(()=>{
    let alive=true;setState({loading:true,error:null,days:[]});
    void(async()=>{try{
      const result=await supabase.rpc('get_coach_program_schedule',{p_trainee_id:traineeId,p_from:from,p_to:to});
      if(result.error)throw new Error(result.error.message);
      if(!Array.isArray(result.data))throw new Error('Invalid program schedule response.');
      if(alive)setState({loading:false,error:null,days:result.data as unknown as Day[]});
    }catch(cause){if(alive)setState({loading:false,error:cause instanceof Error?cause.message:'Could not read program schedule.',days:[]});}})();
    return()=>{alive=false;};
  },[traineeId,from,to,attempt]);
  return <section aria-label="Live program calendar" className="space-y-2">
    <h2 className="font-semibold">Live program and group days</h2>
    <button className="border rounded p-2" onClick={()=>setAttempt(n=>n+1)}>Reload program schedule</button>
    {state.loading&&<p role="status">Loading program schedule…</p>}{state.error&&<p role="alert">{state.error}</p>}
    {!state.loading&&!state.error&&!state.days.length&&<p>No active program days for this trainee/month.</p>}
    {state.days.map(day=><p key={`${day.program_id}:${day.anchor_date}:${day.slot_id}`}>{day.scheduled_date} · {day.program_name} · {day.label}{day.rest?' · Rest':''} · revision {day.revision} · {day.source}</p>)}
    <p className="text-sm text-muted-foreground">Update program days or its delivery start date in Programs. This calendar view reads current planning metadata and creates no workout copies.</p>
  </section>;
}
