import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createSchema } from '../../scripts/schema.mjs';

let db;
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const coachA = id(1), coachB = id(2), clientA = id(3), clientB = id(4);
async function asUser(userId, action, role = 'authenticated') {
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [userId ?? '']);
  await db.exec(`SET ROLE ${role}`);
  try { return await action(); }
  finally { await db.exec('RESET ROLE'); }
}
const rows = async (sql, args = []) => (await db.query(sql, args)).rows;

before(async () => {
  db = await createSchema();
  await db.exec(`INSERT INTO coach_allowlist(email) VALUES ('coach-a@test.invalid'), ('coach-b@test.invalid');`);
  for (const [uid, email] of [[coachA,'coach-a'],[coachB,'coach-b'],[clientA,'client-a'],[clientB,'client-b']]) {
    await db.query('INSERT INTO auth.users(id,email) VALUES ($1,$2)', [uid, `${email}@test.invalid`]);
  }
  await asUser(clientA, () => db.query('SELECT claim_coach_by_id($1)', [coachA]));
  await asUser(clientB, () => db.query('SELECT claim_coach_by_id($1)', [coachB]));
  await db.query("INSERT INTO exercises(id,name,target_muscle_group) VALUES ($1,'Squat','Quads')", [id(10)]);
}, { timeout: 30000 });
after(async () => { await db?.close(); });

test('canonical mobile baseline is safe on a database where drafts were already applied', async () => {
  await asUser(clientA, () => db.query("INSERT INTO custom_foods(id,user_id,name) VALUES ($1,$2,'Existing meal')", [id(11),clientA]));
  await db.exec(await readFile(new URL('../../supabase/migrations/20260921000000_mobile_schema_baseline.sql', import.meta.url),'utf8'));
  assert.equal((await rows('SELECT name FROM custom_foods WHERE id=$1',[id(11)]))[0].name, 'Existing meal');
});

test('profile editing cannot promote an account or change its coach', async () => {
  await asUser(clientA, async () => {
    await assert.rejects(db.query("UPDATE profiles SET role='coach' WHERE id=$1",[clientA]), /permission denied/);
    await assert.rejects(db.query('UPDATE profiles SET is_platform_admin=true WHERE id=$1',[clientA]), /permission denied/);
    await assert.rejects(db.query('UPDATE profiles SET coach_id=$1 WHERE id=$2',[coachB,clientA]), /permission denied/);
    await db.query("UPDATE profiles SET first_name='Athlete' WHERE id=$1",[clientA]);
  });
});

test('assigned workout -> repeated session delivery -> sets -> isolated coach read', async () => {
  await asUser(coachA, async () => {
    await db.query("INSERT INTO workout_templates(id,creator_id,name,scope,assigned_trainee_id) VALUES ($1,$2,'Assigned','ASSIGNED',$3)",[id(20),coachA,clientA]);
    await db.query('INSERT INTO template_items(template_id,exercise_id,position) VALUES ($1,$2,1)',[id(20),id(10)]);
  });
  const session = { id:id(21),user_id:clientA,template_id:id(20),session_name:'Assigned',duration_seconds:120,completed_at:new Date().toISOString() };
  await asUser(clientA, async () => {
    assert.equal((await rows('SELECT * FROM template_items WHERE template_id=$1',[id(20)])).length,1);
    await db.query('SELECT sync_workout_session($1)',[JSON.stringify(session)]);
    await db.query('SELECT sync_workout_session($1)',[JSON.stringify(session)]);
    await db.query('SELECT sync_workout_session($1)',[JSON.stringify({...session,duration_seconds:300})]);
    assert.equal((await rows('SELECT * FROM workout_sessions WHERE id=$1',[id(21)])).length,1);
    assert.equal((await rows('SELECT duration_seconds FROM workout_sessions WHERE id=$1',[id(21)]))[0].duration_seconds,300);
    await db.query('INSERT INTO set_logs(id,session_id,exercise_id,set_number,weight_kg,reps) VALUES ($1,$2,$3,1,60,5) ON CONFLICT(id) DO UPDATE SET reps=EXCLUDED.reps',[id(22),id(21),id(10)]);
    await db.query('INSERT INTO set_logs(id,session_id,exercise_id,set_number,weight_kg,reps) VALUES ($1,$2,$3,1,60,5) ON CONFLICT(id) DO UPDATE SET reps=EXCLUDED.reps',[id(22),id(21),id(10)]);
  });
  await asUser(coachA, async () => assert.equal((await rows('SELECT * FROM set_logs WHERE id=$1',[id(22)])).length,1));
  await asUser(coachB, async () => assert.equal((await rows('SELECT * FROM set_logs WHERE id=$1',[id(22)])).length,0));
  await asUser(clientB, async () => {
    assert.equal((await rows('SELECT * FROM workout_templates WHERE id=$1',[id(20)])).length,0);
    await assert.rejects(db.query('SELECT sync_workout_session($1)',[JSON.stringify({...session,user_id:clientB,template_id:null})]), /another account/);
    await assert.rejects(db.query('SELECT sync_workout_session($1)',[JSON.stringify({...session,id:id(23),user_id:clientB})]), /unavailable/);
  });
});

test('cardio add/delete drives only the owning coach summary; days are inclusive', async () => {
  await asUser(clientA, async () => {
    await db.query("INSERT INTO cardio_exercises(id,user_id,name) VALUES ($1,$2,'Run')",[id(30),clientA]);
    await db.query('INSERT INTO cardio_entries(id,user_id,cardio_exercise_id,entry_date,duration_seconds) VALUES ($1,$2,$3,CURRENT_DATE,1800)',[id(31),clientA,id(30)]);
    await db.query('INSERT INTO cardio_entries(id,user_id,cardio_exercise_id,entry_date,duration_seconds) VALUES ($1,$2,$3,CURRENT_DATE-7,600)',[id(32),clientA,id(30)]);
  });
  await asUser(coachA, async () => {
    const result = await rows('SELECT * FROM get_coach_cardio_summary($1,7)',[coachA]);
    assert.equal(result.length,1); assert.equal(Number(result[0].cardio_minutes),30); assert.equal(Number(result[0].cardio_sessions),1);
    assert.equal((await rows('SELECT * FROM get_coach_cardio_summary($1,7)',[coachB])).length,0);
  });
  await asUser(clientA, () => db.query('DELETE FROM cardio_entries WHERE id=$1',[id(31)]));
  await asUser(coachA, async () => assert.equal(Number((await rows('SELECT * FROM get_coach_cardio_summary($1,7)',[coachA]))[0].cardio_minutes),0));
});

test('check-in and form review round trips are isolated between coaches', async () => {
  await asUser(coachA, () => db.query("INSERT INTO check_in_templates(id,coach_id,name) VALUES ($1,$2,'Weekly')",[id(40),coachA]));
  await asUser(clientA, async () => {
    await assert.rejects(db.query("INSERT INTO form_checks(client_id,status,coach_notes) VALUES ($1,'reviewed','Forged')",[clientA]), /row-level security/);
    await db.query("INSERT INTO check_ins(id,client_id,template_id,status,scheduled_for,responses) VALUES ($1,$2,$3,'submitted',CURRENT_DATE,'{}')",[id(41),clientA,id(40)]);
    await db.query("INSERT INTO form_checks(id,client_id,exercise_id,video_key) VALUES ($1,$2,$3,'form-video/test.mp4')",[id(42),clientA,id(10)]);
    assert.equal((await rows('SELECT coach_id FROM check_ins WHERE id=$1',[id(41)]))[0].coach_id,coachA);
  });
  await asUser(clientB, async () => {
    await assert.rejects(db.query("INSERT INTO check_ins(client_id,template_id,status,scheduled_for) VALUES ($1,$2,'submitted',CURRENT_DATE)",[clientB,id(40)]), /does not belong/);
  });
  await asUser(coachB, async () => {
    assert.equal((await rows('SELECT * FROM check_ins WHERE id=$1',[id(41)])).length,0);
    assert.equal((await rows('SELECT * FROM form_checks WHERE id=$1',[id(42)])).length,0);
  });
  await asUser(coachA, async () => {
    await db.query("UPDATE check_ins SET status='reviewed',coach_notes='Good work',reviewed_by=$1,reviewed_at=now() WHERE id=$2",[coachA,id(41)]);
    await db.query("UPDATE form_checks SET status='reviewed',coach_notes='Good depth',reviewed_at=now() WHERE id=$1",[id(42)]);
  });
  await asUser(clientA, async () => {
    assert.equal((await rows('SELECT coach_notes FROM check_ins WHERE id=$1',[id(41)]))[0].coach_notes,'Good work');
    assert.equal((await rows('SELECT coach_notes FROM form_checks WHERE id=$1',[id(42)]))[0].coach_notes,'Good depth');
    await db.query("UPDATE check_ins SET coach_notes='Forged' WHERE id=$1",[id(41)]);
    assert.equal((await rows('SELECT coach_notes FROM check_ins WHERE id=$1',[id(41)]))[0].coach_notes,'Good work');
  });
});

test('token join clones private workouts once, preserves rest days, and hides shared sources', async () => {
  await asUser(clientA, async () => {
    await db.query("INSERT INTO workout_templates(id,creator_id,name) VALUES ($1,$2,'Private workout')",[id(50),clientA]);
    await db.query('INSERT INTO template_items(template_id,exercise_id,position,rest_seconds) VALUES ($1,$2,1,120)',[id(50),id(10)]);
    await db.query("INSERT INTO workout_programs(id,owner_id,name,total_weeks,share_token) VALUES ($1,$2,'Private program',1,$3)",[id(51),clientA,id(52)]);
    await db.query('INSERT INTO program_days(program_id,week_number,day_of_week,workout_template_id) VALUES ($1,1,1,$2),($1,1,2,$2),($1,1,3,NULL)',[id(51),id(50)]);
  });
  let joined;
  await asUser(clientB, async () => {
    assert.equal((await rows('SELECT * FROM workout_programs WHERE share_token IS NOT NULL')).length,0);
    assert.equal((await rows('SELECT * FROM program_days WHERE program_id=$1',[id(51)])).length,0);
    await assert.rejects(db.query('SELECT join_program_by_token($1)',[id(99)]), /No program/);
    joined = (await rows('SELECT join_program_by_token($1) AS id',[id(52)]))[0].id;
    const days = await rows('SELECT workout_template_id FROM program_days WHERE program_id=$1 ORDER BY day_of_week',[joined]);
    assert.equal(days.length,3); assert.equal(days[0].workout_template_id,days[1].workout_template_id); assert.equal(days[2].workout_template_id,null);
    assert.notEqual(days[0].workout_template_id,id(50));
    const items = await rows('SELECT rest_seconds FROM template_items WHERE template_id=$1',[days[0].workout_template_id]);
    assert.equal(items[0].rest_seconds,120);
  });
  await asUser(clientA, () => db.query('DELETE FROM workout_programs WHERE id=$1',[id(51)]));
  await asUser(clientB, async () => assert.equal((await rows('SELECT * FROM program_days WHERE program_id=$1',[joined])).length,3));
  await asUser(null, async () => assert.rejects(db.query('SELECT join_program_by_token($1)',[id(52)]), /permission denied/), 'anon');
});

test('malicious source cannot use the sharing definer to copy another private workout', async () => {
  await asUser(clientA, () => db.query("INSERT INTO workout_templates(id,creator_id,name) VALUES ($1,$2,'Secret')",[id(60),clientA]));
  await asUser(clientB, async () => {
    await db.query("INSERT INTO workout_programs(id,owner_id,name,total_weeks,share_token) VALUES ($1,$2,'Malicious',1,$3)",[id(61),clientB,id(62)]);
    await db.query('INSERT INTO program_days(program_id,week_number,day_of_week,workout_template_id) VALUES ($1,1,1,$2)',[id(61),id(60)]);
    const count = (await rows('SELECT count(*) FROM workout_programs'))[0].count;
    await assert.rejects(db.query('SELECT join_program_by_token($1)',[id(62)]), /unavailable/);
    assert.equal((await rows('SELECT count(*) FROM workout_programs'))[0].count,count);
  });
});

test('nutrition and steps are visible to the connected coach only', async () => {
  await asUser(clientA, async () => {
    await db.query('INSERT INTO nutrition_logs(id,user_id,calories) VALUES ($1,$2,500)',[id(70),clientA]);
    await db.query('INSERT INTO wearable_biometrics(user_id,recorded_date,step_count) VALUES ($1,CURRENT_DATE,8000)',[clientA]);
  });
  await asUser(coachA, async () => {
    assert.equal((await rows('SELECT calories FROM nutrition_logs WHERE id=$1',[id(70)]))[0].calories,500);
    assert.equal(Number((await rows('SELECT * FROM get_coach_steps_summary($1,7)',[coachA]))[0].avg_daily_steps),8000);
  });
  await asUser(coachB, async () => assert.equal((await rows('SELECT * FROM nutrition_logs WHERE id=$1',[id(70)])).length,0));
});

test('optional local seed executes against the complete canonical schema', async () => {
  await db.exec(await readFile(new URL('../../supabase/seed.sql', import.meta.url), 'utf8'));
  assert.equal((await rows("SELECT * FROM landing_pages WHERE slug='john'")).length,1);
});
