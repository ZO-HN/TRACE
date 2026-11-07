import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createSchema } from '../../scripts/schema.mjs';

let db;
const id = (n) => `20000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const coach=id(1), other=id(2), trainee=id(3), unrelated=id(4), exercise=id(10);
async function asUser(user, action, role='authenticated') {
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[user ?? '']); await db.exec(`SET ROLE ${role}`);
  try { return await action(); } finally { await db.exec('RESET ROLE'); }
}
const rows=async(sql,args=[]) => (await db.query(sql,args)).rows;
const item=(position,over={})=>({exercise_id:exercise,position,target_sets:3,target_reps:8,target_rpe:null,rest_seconds:90,...over});
const snapshot=(items=[item(1,{target_rpe:7,rest_seconds:120}),item(2,{target_sets:2,target_reps:12,target_rpe:null,rest_seconds:0})])=>({name:'Fixed source',description:'Description',items});
const assign=(op,copy,source,recipient,expected=snapshot(),caller=coach,claimedCoach=caller)=>asUser(caller,()=>db.query(
  'SELECT assign_workout_template($1,$2,$3,$4,$5,$6::jsonb) AS id',[op,copy,source,claimedCoach,recipient,JSON.stringify(expected)]));
before(async()=>{
  db=await createSchema(); await db.exec("INSERT INTO coach_allowlist(email) VALUES ('assign-a@test.invalid'),('assign-b@test.invalid')");
  for(const [uid,email,role] of [[coach,'assign-a','coach'],[other,'assign-b','coach'],[trainee,'assign-trainee','trainee'],[unrelated,'assign-unrelated','trainee']])
    await db.query('INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES ($1,$2,$3::jsonb)',[uid,`${email}@test.invalid`,JSON.stringify({role})]);
  await asUser(trainee,()=>db.query('SELECT claim_coach_by_id($1)',[coach]));
  await asUser(unrelated,()=>db.query('SELECT claim_coach_by_id($1)',[other]));
  await db.query("INSERT INTO exercises(id,name,target_muscle_group) VALUES ($1,'Squat','Quads')",[exercise]);
  await asUser(coach,async()=>{
    await db.query("INSERT INTO workout_templates(id,creator_id,name,description,scope) VALUES ($1,$2,'Fixed source','Description','PRIVATE')",[id(20),coach]);
    await db.query('INSERT INTO template_items(template_id,exercise_id,position,target_sets,target_reps,target_rpe,rest_seconds) VALUES ($1,$2,1,3,8,7,120),($1,$2,2,2,12,NULL,0)',[id(20),exercise]);
  });
},{timeout:90000});
after(async()=>{await db?.close();});

test('assigns one immutable ordered copy and safely replays the same operation',async()=>{
  const expected=snapshot(), op=id(30), copy=id(31);
  await asUser(coach,async()=>{
    await assert.rejects(db.query('SELECT * FROM workout_assignment_operations'),/permission denied/);
    await assert.rejects(db.query('SELECT public.is_fixed_workout($1)',[id(31)]),/permission denied/);
    await assert.rejects(db.query("INSERT INTO workout_assignment_operations(operation_id,assigned_template_id,source_template_id,coach_id,trainee_id,request,source_snapshot) VALUES ($1,$2,$3,$4,$5,'{}','{}')",[id(39),id(38),id(20),coach,trainee]),/permission denied/);
    await assert.rejects(db.query('UPDATE workout_assignment_operations SET assigned_at=now() WHERE operation_id=$1',[op]),/permission denied/);
  });
  await asUser(coach,async()=>{
    assert.equal((await assign(op,copy,id(20),trainee,expected)).rows[0].id,copy);
    assert.equal((await assign(op,copy,id(20),trainee,expected)).rows[0].id,copy);
    await assert.rejects(assign(op,id(32),id(20),trainee,expected),/different content or ownership/);
    await assert.rejects(db.query('UPDATE workout_templates SET name=$1 WHERE id=$2',['Changed',copy]),/immutable/);
    await assert.rejects(db.query('UPDATE workout_templates SET id=$1 WHERE id=$2',[id(34),copy]),/immutable/);
    await assert.rejects(db.query('DELETE FROM workout_templates WHERE id=$1',[copy]),/immutable/);
    await assert.rejects(db.query('UPDATE template_items SET rest_seconds=30 WHERE template_id=$1',[copy]),/immutable/);
    await db.query("INSERT INTO workout_templates(id,creator_id,name,scope) VALUES ($1,$2,'Move destination','PRIVATE')",[id(35),coach]);
    await assert.rejects(db.query('UPDATE template_items SET template_id=$1 WHERE template_id=$2 AND position=1',[id(35),copy]),/immutable/);
    await assert.rejects(db.query('DELETE FROM template_items WHERE template_id=$1',[copy]),/immutable/);
    await assert.rejects(db.query("INSERT INTO workout_templates(id,creator_id,name,scope,assigned_trainee_id) VALUES ($1,$2,'Forged','ASSIGNED',$3)",[id(33),coach,trainee]),/assignment operation/);
  });
  await asUser(trainee,async()=>{
    assert.deepEqual(await rows('SELECT id,name,scope,assigned_trainee_id FROM workout_templates WHERE id=$1',[copy]),[{id:copy,name:'Fixed source',scope:'ASSIGNED',assigned_trainee_id:trainee}]);
    assert.deepEqual(await rows('SELECT exercise_id,position,target_sets,target_reps,target_rpe,rest_seconds FROM template_items WHERE template_id=$1 ORDER BY position',[copy]),expected.items);
    assert.equal((await rows('SELECT id FROM workout_templates WHERE id=$1',[id(34)])).length,0);
    assert.equal((await rows('SELECT id FROM template_items WHERE template_id=$1',[id(35)])).length,0);
  });
});

test('rejects unrelated recipients, foreign sources, forged coaches and stale snapshots atomically',async()=>{
  await assert.rejects(assign(id(40),id(41),id(20),unrelated),/not currently linked/);
  await assert.rejects(assign(id(42),id(43),id(20),trainee,snapshot(),coach,other),/authenticated coach/);
  await asUser(other,()=>db.query("INSERT INTO workout_templates(id,creator_id,name,scope) VALUES ($1,$2,'Other private','PRIVATE')",[id(44),other]));
  await assert.rejects(assign(id(45),id(46),id(44),trainee,snapshot(),other),/not currently linked/);
  const stale=snapshot(); stale.items[0].target_reps=99;
  await assert.rejects(assign(id(47),id(48),id(20),trainee,stale),/Source workout changed/);
  for(const copy of [id(41),id(43),id(46),id(48)]) assert.equal((await rows('SELECT id FROM workout_templates WHERE id=$1',[copy])).length,0);
});

test('holds source parent and item write locks while validating and copying its snapshot',async()=>{
  await db.exec('BEGIN');
  try {
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[coach]);
    await db.exec('SET ROLE authenticated');
    await db.query('SELECT assign_workout_template($1,$2,$3,$4,$5,$6::jsonb)',
      [id(62),id(63),id(20),coach,trainee,JSON.stringify(snapshot())]);
    const locks=await rows(`SELECT relation::regclass::text AS relation,mode FROM pg_locks
      WHERE pid=pg_backend_pid() AND locktype='relation'
        AND relation IN ('public.workout_templates'::regclass,'public.template_items'::regclass)`);
    assert.ok(locks.some((lock)=>lock.relation==='workout_templates'&&lock.mode==='RowShareLock'));
    assert.ok(locks.some((lock)=>lock.relation==='template_items'&&lock.mode==='RowShareLock'));
  } finally { await db.exec('RESET ROLE'); await db.exec('ROLLBACK'); }
});

test('later source changes require another copy and performed records retain original template IDs',async()=>{
  const old=id(51), next=id(52), source=id(20), session=id(53);
  await assign(id(50),old,source,trainee);
  await asUser(trainee,async()=>{
    await db.query('SELECT sync_workout_session($1::jsonb)',[JSON.stringify({id:session,user_id:trainee,template_id:old,session_name:'Fixed source',duration_seconds:120})]);
    await db.query('INSERT INTO set_logs(id,session_id,exercise_id,set_number,weight_kg,reps) VALUES ($1,$2,$3,1,80,8)',[id(54),session,exercise]);
  });
  await asUser(coach,()=>db.query('UPDATE template_items SET target_reps=10 WHERE template_id=$1 AND position=1',[source]));
  const updated=snapshot(); updated.items[0].target_reps=10;
  await assign(id(55),next,source,trainee,updated);
  await asUser(trainee,async()=>{
    assert.equal((await rows('SELECT target_reps FROM template_items WHERE template_id=$1 AND position=1',[old]))[0].target_reps,8);
    assert.equal((await rows('SELECT target_reps FROM template_items WHERE template_id=$1 AND position=1',[next]))[0].target_reps,10);
    assert.equal((await rows('SELECT template_id FROM workout_sessions WHERE id=$1',[session]))[0].template_id,old);
    assert.equal((await rows('SELECT weight_kg::text AS weight,reps FROM set_logs WHERE id=$1',[id(54)]))[0].reps,8);
  });
});
