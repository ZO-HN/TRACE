import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {createSchema} from '../../scripts/schema.mjs';
let db;
const id=n=>`79000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const coach=id(1),other=id(2),trainee=id(3),stranger=id(4),source=id(5),exercise=id(6);
const snapshot={name:'Dated workout',description:null,items:[{exercise_id:exercise,position:1,target_sets:3,target_reps:8,target_rpe:null,rest_seconds:0}]};
const rows=async(sql,args=[]) => (await db.query(sql,args)).rows;
async function as(user,fn){await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[user??'']);await db.exec('SET ROLE authenticated');try{return await fn();}finally{await db.exec('RESET ROLE');}}
const schedule=(n,date='2026-12-31',who=coach,recipient=trainee,event=id(n+1),expected=snapshot)=>as(who,()=>db.query('SELECT schedule_coach_workout($1,$2,$3,$4,$5,$6,$7,$8::jsonb) AS id',[id(n),event,id(n+2),source,who,recipient,date,JSON.stringify(expected)]));
const change=(n,event,revision,date,cancelled=false,who=coach)=>as(who,()=>db.query('SELECT change_coach_calendar($1,$2,$3,$4,$5,$6) AS revision',[id(n),event,who,revision,date,cancelled]));
before(async()=>{
  db=await createSchema();await db.exec("INSERT INTO coach_allowlist(email) VALUES ('calendar-a@test.invalid'),('calendar-b@test.invalid')");
  for(const [uid,email,role] of [[coach,'calendar-a','coach'],[other,'calendar-b','coach'],[trainee,'calendar-t','trainee'],[stranger,'calendar-u','trainee']])
    await db.query('INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES ($1,$2,$3::jsonb)',[uid,`${email}@test.invalid`,JSON.stringify({role})]);
  await as(trainee,()=>db.query('SELECT claim_coach_by_id($1)',[coach]));await as(stranger,()=>db.query('SELECT claim_coach_by_id($1)',[other]));
  await db.query("INSERT INTO exercises(id,name,target_muscle_group) VALUES ($1,'Squat','Quads')",[exercise]);
  await as(coach,async()=>{await db.query("INSERT INTO workout_templates(id,creator_id,name,scope) VALUES ($1,$2,'Dated workout','PRIVATE')",[source,coach]);
    await db.query('INSERT INTO template_items(template_id,exercise_id,position,target_sets,target_reps,rest_seconds) VALUES($1,$2,1,3,8,0)',[source,exercise]);});
},{timeout:90000});
after(async()=>db?.close());
test('calendar persists an exact dated fixed copy and enforces current ownership/read grants',async()=>{
  assert.equal((await schedule(10)).rows[0].id,id(11));assert.equal((await schedule(10)).rows[0].id,id(11));
  await assert.rejects(schedule(10,'2027-01-01'),/different content/);
  await as(trainee,async()=>{const event=(await rows('SELECT id,template_id,scheduled_date::text,revision FROM coach_calendar_assignments'))[0];
    assert.deepEqual(event,{id:id(11),template_id:id(12),scheduled_date:'2026-12-31',revision:1});
    assert.equal((await rows('SELECT target_reps FROM template_items WHERE template_id=$1',[id(12)]))[0].target_reps,8);
    await assert.rejects(db.query('SELECT request FROM coach_calendar_assignments'),/permission denied/);
    await assert.rejects(db.query("UPDATE coach_calendar_assignments SET cancelled=true"),/permission denied/);});
  for(const user of [other,stranger]) await as(user,async()=>assert.equal((await rows('SELECT id FROM coach_calendar_assignments')).length,0));
  await assert.rejects(schedule(20,'2027-01-01',coach,stranger),/not currently linked/);
  await assert.rejects(schedule(23,'2027-01-01',trainee),/authenticated coach/);
  await assert.rejects(schedule(26,'infinity'),/valid calendar date/);
  await as(coach,async()=>{await db.query('UPDATE template_items SET target_reps=10 WHERE template_id=$1',[source]);
    assert.equal((await rows('SELECT target_reps FROM template_items WHERE template_id=$1',[id(12)]))[0].target_reps,8);
    await db.query('UPDATE template_items SET target_reps=8 WHERE template_id=$1',[source]);});
});
test('event collision rolls back the copy and receipt; moves are revision checked and replayable',async()=>{
  await assert.rejects(schedule(30,'2027-01-02',coach,trainee,id(11)),/duplicate key/);
  assert.equal((await rows('SELECT id FROM workout_templates WHERE id=$1',[id(32)])).length,0);
  assert.equal((await rows('SELECT operation_id FROM workout_assignment_operations WHERE operation_id=$1',[id(30)])).length,0);
  assert.equal((await change(40,id(11),1,'2027-01-01')).rows[0].revision,2);
  assert.equal((await change(40,id(11),1,'2027-01-01')).rows[0].revision,2);
  await assert.rejects(change(40,id(11),1,'2027-01-02'),/different content/);
  await assert.rejects(change(41,id(11),1,'2027-01-02'),/changed. Reload/);
  await assert.rejects(change(42,id(11),2,'2027-01-02',false,other),/unavailable/);
  assert.equal((await change(43,id(11),2,'2027-01-01',true)).rows[0].revision,3);
  await assert.rejects(change(44,id(11),3,'2027-01-01'),/Cancelled assignments/);
  await as(trainee,async()=>{
    assert.equal((await rows('SELECT id FROM workout_templates WHERE id=$1',[id(12)])).length,1);
    // An already-downloaded offline session remains deliverable after cancellation.
    await db.query('SELECT sync_workout_session($1::jsonb)',[JSON.stringify({id:id(45),user_id:trainee,template_id:id(12),session_name:'Offline work',duration_seconds:10})]);
  });
});
test('recorded sessions and historical copies survive reassignment; former coach cannot change plans',async()=>{
  await schedule(50,'2027-01-03');
  await as(trainee,()=>db.query('SELECT sync_workout_session($1::jsonb)',[JSON.stringify({id:id(53),user_id:trainee,template_id:id(52),session_name:'Recorded',duration_seconds:10})]));
  await assert.rejects(change(54,id(51),1,'2027-01-04'),/recorded workout/);
  await db.query('UPDATE profiles SET coach_id=$1 WHERE id=$2',[other,trainee]);
  await assert.rejects(change(55,id(51),1,'2027-01-04'),/not currently linked/);
  await as(coach,async()=>assert.equal((await rows('SELECT id FROM coach_calendar_assignments')).length,0));
  await as(trainee,async()=>assert.equal((await rows('SELECT id FROM coach_calendar_assignments')).length,2));
});
