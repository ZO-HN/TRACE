import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {createSchema} from '../../scripts/schema.mjs';
let db;
const id=n=>`81000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const coach=id(1),other=id(2),trainee=id(3),stranger=id(4),program=id(5),source=id(6),exercise=id(7),group=id(8),slot=id(9),rest=id(10);
const slots=()=>[{id:slot,offset:0,label:'Training',template_id:source},{id:rest,offset:1,label:'Rest',template_id:null}];
const rows=async(sql,args=[]) => (await db.query(sql,args)).rows;
async function as(user,fn){await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[user??'']);await db.exec('SET ROLE authenticated');try{return await fn();}finally{await db.exec('RESET ROLE');}}
const save=(op,revision,days=slots(),user=coach)=>as(user,()=>db.query('SELECT save_coach_program($1,$2,$3,$4,$5::jsonb) AS revision',[id(op),program,user,revision,JSON.stringify(days)]));
const deliver=(op,delivery,recipient,revision=0,start='2028-02-28',groupId=null,active=true,prog=program)=>as(coach,()=>db.query('SELECT set_coach_program_delivery($1,$2,$3,$4,$5,$6,$7,$8,$9) AS revision',[id(op),id(delivery),prog,coach,start,active,revision,recipient,groupId]));
const schedule=(user=trainee)=>as(user,()=>rows('SELECT get_coach_program_schedule($1,$2,$3) AS days',[trainee,'2028-02-28','2028-03-01'])).then(r=>r[0].days);
const open=(op,revision=1,who=trainee,which=slot)=>as(who,()=>rows('SELECT open_coach_program_workout($1,$2,$3,$4,$5,$6) AS id',[id(op),trainee,program,which,'2028-02-28',revision])).then(r=>r[0].id);
before(async()=>{
  db=await createSchema();await db.exec("INSERT INTO coach_allowlist(email) VALUES ('live-a@test.invalid'),('live-b@test.invalid')");
  for(const [uid,email,role] of [[coach,'live-a','coach'],[other,'live-b','coach'],[trainee,'live-t','trainee'],[stranger,'live-u','trainee']])
    await db.query('INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES ($1,$2,$3::jsonb)',[uid,`${email}@test.invalid`,JSON.stringify({role})]);
  await as(trainee,()=>db.query('SELECT claim_coach_by_id($1)',[coach]));await as(stranger,()=>db.query('SELECT claim_coach_by_id($1)',[other]));
  await db.query("INSERT INTO exercises(id,name,target_muscle_group) VALUES ($1,'Squat','Quads')",[exercise]);
  await as(coach,async()=>{
    await db.query("INSERT INTO programs(id,coach_id,name) VALUES ($1,$2,'Live program')",[program,coach]);
    await db.query("INSERT INTO training_groups(id,coach_id,name) VALUES ($1,$2,'Morning')",[group,coach]);
    await db.query("INSERT INTO workout_templates(id,creator_id,name,scope) VALUES ($1,$2,'Program squat','PRIVATE')",[source,coach]);
    await db.query('INSERT INTO template_items(template_id,exercise_id,position,target_sets,target_reps,rest_seconds) VALUES($1,$2,1,3,8,0)',[source,exercise]);
  });
},{timeout:90000});
after(async()=>db?.close());
test('program publication is revision checked, idempotent, owned and atomic',async()=>{
  assert.equal((await save(20,0)).rows[0].revision,1);assert.equal((await save(20,0)).rows[0].revision,1);
  await assert.rejects(save(20,0,[{...slots()[0],label:'Changed'}]),/different content/);
  await assert.rejects(save(21,0),/changed. Reload/);
  await assert.rejects(save(22,1,[slots()[0],slots()[0]]),/unique/);
  await assert.rejects(save(23,1,[{...slots()[0],offset:0.5}]),/day offset/);
  await assert.rejects(save(24,1,slots(),other),/unavailable/);
  await assert.rejects(save(25,1,slots(),trainee),/authenticated coach/);
  await as(coach,async()=>{
    assert.equal((await rows('SELECT revision FROM coach_program_heads WHERE program_id=$1',[program]))[0].revision,1);
    await assert.rejects(db.query("UPDATE coach_program_heads SET slots='[]'"),/permission denied/);
    await assert.rejects(db.query('SELECT * FROM coach_program_operations'),/permission denied/);
  });
});
test('direct and group sources combine without duplicating a day; reads do not create copies',async()=>{
  await deliver(30,31,trainee);await as(coach,()=>db.query('INSERT INTO training_group_members(group_id,client_id) VALUES($1,$2)',[group,trainee]));
  await deliver(32,33,null,0,'2028-02-28',group);
  const days=await schedule();assert.equal(days.length,2);assert.equal(days[0].source,'Coach program, Group: Morning');
  assert.equal(days[1].scheduled_date,'2028-02-29');assert.equal(days[1].rest,true);
  assert.equal((await rows('SELECT id FROM coach_program_grants')).length,0);
  await assert.rejects(schedule(stranger),/another trainee/);assert.deepEqual(await schedule(coach),days);
  await assert.rejects(deliver(34,35,stranger),/not currently linked/);
  await as(coach,()=>assert.rejects(db.query('INSERT INTO training_group_members(group_id,client_id) VALUES($1,$2)',[group,stranger]),/not currently linked/));
  await assert.rejects(open(36,1,stranger),/owning trainee/);await assert.rejects(open(37,1,trainee,rest),/no program workout/);
});
test('foreign private sources, foreign groups/program links and forged coach identities are rejected',async()=>{
  const foreignSource=id(80),foreignProgram=id(81),foreignGroup=id(82);
  await as(other,async()=>{
    await db.query("INSERT INTO workout_templates(id,creator_id,name,scope) VALUES($1,$2,'Foreign private','PRIVATE')",[foreignSource,other]);
    await db.query("INSERT INTO programs(id,coach_id,name) VALUES($1,$2,'Foreign program')",[foreignProgram,other]);
    await db.query("INSERT INTO training_groups(id,coach_id,name) VALUES($1,$2,'Foreign group')",[foreignGroup,other]);
  });
  await assert.rejects(save(83,1,[{...slots()[0],template_id:foreignSource}]),/active private workout owned/);
  await assert.rejects(deliver(84,85,null,0,'2028-02-28',foreignGroup),/Training group unavailable/);
  await as(coach,()=>assert.rejects(db.query('UPDATE training_groups SET program_id=$1 WHERE id=$2',[foreignProgram,group]),/another coach/));
  await as(other,()=>assert.rejects(db.query('SELECT save_coach_program($1,$2,$3,$4,$5::jsonb)',[id(86),program,coach,1,JSON.stringify(slots())]),/authenticated coach/));
  await as(null,()=>assert.rejects(db.query('SELECT get_coach_program_schedule($1,$2,$3)',[trainee,'2028-02-28','2028-03-01']),/another trainee/));
  assert.equal((await schedule())[0].revision,1);
});
let firstCopy;
test('opens only on demand and reuses exact issued contents without changing performed work',async()=>{
  firstCopy=await open(40);assert.equal(await open(40),firstCopy);assert.equal(await open(41),firstCopy);
  assert.equal((await rows('SELECT id FROM coach_program_grants')).length,1);
  await as(other,async()=>assert.equal((await rows('SELECT template_id FROM coach_program_grants')).length,0));
  await as(trainee,async()=>{
    assert.equal((await rows('SELECT delivery_kind FROM workout_templates WHERE id=$1',[firstCopy]))[0].delivery_kind,'program');
    assert.equal((await rows('UPDATE template_items SET target_reps=99 WHERE template_id=$1 RETURNING id',[firstCopy])).length,0);
    assert.equal((await rows('SELECT target_reps FROM template_items WHERE template_id=$1',[firstCopy]))[0].target_reps,8);
    await assert.rejects(db.query('SELECT snapshot FROM coach_program_grants'),/permission denied/);
    await db.query('SELECT sync_workout_session($1::jsonb)',[JSON.stringify({id:id(42),user_id:trainee,template_id:firstCopy,session_name:'Original',duration_seconds:100})]);
  });
  await as(coach,()=>db.query('UPDATE template_items SET target_reps=10 WHERE template_id=$1',[source]));
  const next=await open(43);assert.notEqual(next,firstCopy);assert.equal(await open(40),firstCopy);
  assert.equal((await rows('SELECT target_reps FROM template_items WHERE template_id=$1',[next]))[0].target_reps,10);
  assert.equal((await rows('SELECT target_reps FROM template_items WHERE template_id=$1',[firstCopy]))[0].target_reps,8);
  assert.equal((await rows('SELECT template_id FROM workout_sessions WHERE id=$1',[id(42)]))[0].template_id,firstCopy);
});
test('program edits automatically update existing sources; stale opens require review instead of silently switching',async()=>{
  const updated=slots();updated[0].label='Updated training';assert.equal((await save(50,1,updated)).rows[0].revision,2);
  assert.equal((await schedule())[0].label,'Updated training');assert.equal((await schedule())[0].revision,2);
  await assert.rejects(open(51),/changed. Reload/);
  const next=await open(52,2);assert.notEqual(next,firstCopy);assert.equal(await open(40),firstCopy);
  await assert.rejects(open(40,2),/different content/);
});
test('removal stops fresh group delivery, preserves direct sources and accepts retained offline copies',async()=>{
  await deliver(60,31,trainee,1,'2028-02-28',null,false);
  assert.equal((await schedule()).length,2);
  await as(coach,()=>db.query('DELETE FROM training_group_members WHERE group_id=$1 AND client_id=$2',[group,trainee]));
  assert.equal((await schedule()).length,0);await assert.rejects(open(61,2),/no longer available/);
  assert.equal(await open(40),firstCopy);
  await as(trainee,()=>db.query('SELECT sync_workout_session($1::jsonb)',[JSON.stringify({id:id(62),user_id:trainee,template_id:firstCopy,session_name:'Offline recovery',duration_seconds:90})]));
  await as(coach,()=>db.query('INSERT INTO training_group_members(group_id,client_id) VALUES($1,$2)',[group,trainee]));
  assert.equal((await schedule()).length,2);
  await assert.rejects(deliver(63,31,trainee,1),/changed. Reload/);
  await assert.rejects(deliver(64,31,trainee,2,'2028-02-28',null,true,id(99)),/Save the coach program/);
});
test('failed copy writes roll back grants and receipts, then retry safely; deletion retains history',async()=>{
  await as(coach,()=>db.query('UPDATE template_items SET target_reps=11 WHERE template_id=$1',[source]));
  await db.exec(`CREATE FUNCTION public.fail_program_test_copy() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
    IF EXISTS(SELECT 1 FROM public.workout_templates WHERE id=NEW.template_id AND delivery_kind='program') THEN RAISE EXCEPTION 'Injected child failure'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER fail_program_test_copy BEFORE INSERT ON public.template_items FOR EACH ROW EXECUTE FUNCTION public.fail_program_test_copy();`);
  const before=(await rows('SELECT id FROM coach_program_grants')).length;
  await assert.rejects(open(70,2),/Injected child failure/);
  assert.equal((await rows('SELECT id FROM coach_program_grants')).length,before);
  assert.equal((await rows('SELECT operation_id FROM coach_program_operations WHERE operation_id=$1',[id(70)])).length,0);
  await db.exec('DROP TRIGGER fail_program_test_copy ON public.template_items; DROP FUNCTION public.fail_program_test_copy()');
  const recovered=await open(70,2);assert.equal(await open(70,2),recovered);
  await as(coach,()=>db.query('DELETE FROM programs WHERE id=$1',[program]));
  assert.equal((await schedule()).length,0);await assert.rejects(open(71,2),/unavailable/);
  assert.equal(await open(70,2),recovered);
  await as(trainee,async()=>assert.equal((await rows('SELECT id FROM workout_templates WHERE id=$1',[recovered])).length,1));
});
