import {useEffect,useState} from 'react';
import {useCoachProgramEditor,type ProgramSlot} from '../../hooks/useCoachProgramEditor';
import {useCoachPrivateWorkouts} from '../../hooks/useCoachPrivateWorkouts';
import {useClients} from '../../hooks/useClients';
import {useTrainingGroups} from '../../hooks/useTrainingGroups';

function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export default function CoachProgramEditor({coachId,programId,name,onClose}:{coachId:string;programId:string;name:string;onClose:()=>void}){
  const editor=useCoachProgramEditor(coachId,programId);
  const library=useCoachPrivateWorkouts(coachId);const roster=useClients(coachId);const groups=useTrainingGroups(coachId);
  const [slots,setSlots]=useState<ProgramSlot[]>([]);const [recipient,setRecipient]=useState('');const [date,setDate]=useState(today);const [active,setActive]=useState(true);
  useEffect(()=>{if(!editor.loading&&!editor.error)setSlots(editor.slots.map(slot=>({...slot})));},[editor.loading,editor.error,editor.slots]);
  const [kind,target]=recipient.split(':');
  const existing=editor.deliveries.find(row=>kind==='group'?row.group_id===target:row.trainee_id===target&&row.program_id===programId);
  useEffect(()=>{setDate(existing?.start_date??today());setActive(existing?.active??true);},[recipient,existing?.start_date,existing?.active]);
  const locked=editor.busy||editor.pending;
  const dirty=JSON.stringify(slots)!==JSON.stringify(editor.slots);
  const update=(index:number,patch:Partial<ProgramSlot>)=>setSlots(rows=>rows.map((row,i)=>i===index?{...row,...patch}:row));
  const valid=slots.length>0&&slots.every(slot=>slot.label.trim()&&Number.isInteger(slot.offset)&&slot.offset>=0&&slot.offset<=365)&&new Set(slots.map(slot=>slot.offset)).size===slots.length;
  const deliver=()=>editor.deliver({p_delivery_id:existing?.id??crypto.randomUUID(),p_trainee_id:kind==='trainee'?target:undefined,p_group_id:kind==='group'?target:undefined,
    p_start_date:date,p_active:active,p_expected_revision:existing?.revision??0});
  return <section aria-label={`Edit program ${name}`} className="rounded-xl border border-border bg-card p-4 space-y-4">
    <div className="flex justify-between gap-3"><h2 className="font-semibold">{name} · revision {editor.revision}</h2><button disabled={locked} onClick={onClose}>Close program</button></div>
    <p className="text-sm text-muted-foreground">Saving updates upcoming program days for existing individual and group deliveries. Opening a workout captures its prescription; later edits never rewrite issued copies, active drafts or performed sets. Days run once from the delivery start date.</p>
    <button disabled={locked} onClick={()=>void editor.refresh()} className="border rounded p-2">Reload program (replaces unsaved days)</button>
    {editor.loading&&<p role="status">Loading program…</p>}{editor.error&&<p role="alert">{editor.error}</p>}
    {!editor.loading&&!editor.error&&<>
      <fieldset disabled={locked} className="space-y-3">
        <legend>Program days</legend>
        {slots.map((slot,index)=><div key={slot.id} className="flex flex-wrap gap-2 border border-border rounded p-3">
          <label>Day <input aria-label={`Day number ${index+1}`} type="number" min={1} max={366} value={Number.isFinite(slot.offset)?slot.offset+1:''} onChange={e=>update(index,{offset:e.target.value===''?NaN:Number(e.target.value)-1})} className="w-20 block border bg-card rounded p-2" /></label>
          <label>Label <input aria-label={`Day label ${index+1}`} maxLength={100} value={slot.label} onChange={e=>update(index,{label:e.target.value})} className="block border bg-card rounded p-2" /></label>
          <label>Workout <select aria-label={`Day workout ${index+1}`} value={slot.template_id??''} onChange={e=>update(index,{template_id:e.target.value||null})} className="block border bg-card rounded p-2">
            <option value="">Rest day</option>{slot.template_id&&!library.rows.some(row=>row.id===slot.template_id)&&<option value={slot.template_id}>Workout unavailable — replace it</option>}
            {library.rows.filter(row=>row.template_items.length).map(row=><option key={row.id} value={row.id}>{row.name}</option>)}
          </select></label>
          <button onClick={()=>setSlots(rows=>rows.filter(row=>row.id!==slot.id))}>Remove day {index+1}</button>
        </div>)}
        <button disabled={slots.length>=366} onClick={()=>{const used=new Set(slots.map(row=>row.offset));const offset=Array.from({length:366},(_,i)=>i).find(i=>!used.has(i));if(offset!==undefined)setSlots(rows=>[...rows,{id:crypto.randomUUID(),offset,label:`Day ${offset+1}`,template_id:null}]);}} className="border rounded p-2">Add program day</button>
        {!valid&&<p className="text-sm">Add at least one labeled day; day numbers must be unique whole numbers from 1 to 366.</p>}
        <button disabled={!valid||Boolean(library.error)} onClick={()=>void editor.save(editor.revision,slots)} className="bg-primary text-primary-foreground rounded p-2 disabled:opacity-50">Save program revision</button>
      </fieldset>
      {library.error&&<div role="alert">{library.error} <button onClick={()=>void library.refresh()}>Retry workout library</button></div>}
      {dirty&&<p className="text-sm">Save or reload the changed program days before changing delivery, so unsaved edits are not replaced by a delivery refresh.</p>}
      <fieldset disabled={locked||editor.revision===0||dirty} className="space-y-2 border-t border-border pt-3">
        <legend>Live delivery</legend>
        <label className="block">Recipient <select aria-label="Program recipient" value={recipient} disabled={roster.isLoading||groups.isLoading||Boolean(roster.error)||Boolean(groups.error)} onChange={e=>setRecipient(e.target.value)} className="block border bg-card rounded p-2">
          <option value="">Choose a trainee or group</option>
          {roster.clients.map(row=><option key={row.id} value={`trainee:${row.id}`}>Trainee: {row.first_name} {row.last_name}</option>)}
          {groups.groups.map(row=><option key={row.id} value={`group:${row.id}`}>Group: {row.name}</option>)}
        </select></label>
        <label className="block">Start date <input aria-label="Program start date" type="date" min="2000-01-01" max="2100-12-31" value={date} onChange={e=>setDate(e.target.value)} className="block border bg-card rounded p-2" /></label>
        <label className="flex gap-2"><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/>Active delivery</label>
        {kind==='group'&&<p className="text-sm">This sets the group’s program and shared cycle. Current members receive upcoming days automatically; additions join the same cycle, removals stop fresh opens. Already issued workouts remain recoverable.</p>}
        <button disabled={!target||!date} onClick={()=>void deliver()} className="border rounded p-2">{active?'Save live delivery':'Stop future delivery'}</button>
        {roster.error&&<div role="alert">{roster.error} <button onClick={()=>void roster.refresh()}>Retry trainees</button></div>}
        {groups.error&&<div role="alert">{groups.error} <button onClick={()=>void groups.refresh()}>Retry groups</button></div>}
      </fieldset>
      <p className="text-sm">{editor.deliveries.filter(row=>row.program_id===programId&&row.active).length} active delivery sources. Group members are resolved at read/open time; direct and group delivery of the same program/start/day share one occurrence.</p>
    </>}
    {editor.busy&&<p role="status">Saving program…</p>}{editor.writeError&&<p role="alert">{editor.writeError}</p>}
    {editor.pending&&!editor.busy&&<><p>Outcome uncertain. Retry unchanged before editing; do not recreate the delivery after navigation without reviewing saved data.</p><button onClick={()=>void editor.retry()} className="border rounded p-2">Retry pending program operation</button></>}
  </section>;
}
