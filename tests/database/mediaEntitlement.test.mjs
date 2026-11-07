import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createSchema } from '../../scripts/schema.mjs';

let db;
const id = (n) => `20000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const coach = id(1), nextCoach = id(2), otherCoach = id(3), trainee = id(4), unrelated = id(5), exercise = id(10);
const rows = async (sql, args = []) => (await db.query(sql, args)).rows;
async function asUser(user, action, role = 'authenticated') {
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [user ?? '']);
  await db.exec(`SET ROLE ${role}`);
  try { return await action(); } finally { await db.exec('RESET ROLE'); }
}
before(async () => {
  db = await createSchema();
  for (const [uid, email] of [[coach, 'media-coach'], [nextCoach, 'media-next'], [otherCoach, 'media-other'], [trainee, 'media-trainee'], [unrelated, 'media-unrelated']]) {
    await db.query('INSERT INTO auth.users(id,email) VALUES ($1,$2)', [uid, `${email}@test.invalid`]);
  }
  await db.query("UPDATE profiles SET role='coach' WHERE id IN ($1,$2,$3)", [coach, nextCoach, otherCoach]);
  await db.query('UPDATE profiles SET coach_id=$1 WHERE id=$2', [coach, trainee]);
  await db.query("INSERT INTO exercises(id,name,target_muscle_group) VALUES ($1,'Squat','Quads')", [exercise]);
  await db.query("INSERT INTO workout_sessions(id,user_id,session_name,duration_seconds) VALUES ($1,$2,'Session',60)", [id(20), trainee]);
  await db.query("INSERT INTO set_logs(id,session_id,exercise_id,set_number,weight_kg,reps) VALUES ($1,$2,$3,1,40,8)", [id(21), id(20), exercise]);
  await db.query(`INSERT INTO media_objects(object_key,owner_id,kind,content_type,declared_size_bytes) VALUES
    ('form-video/${trainee}/set.mp4','${trainee}','form-video','video/mp4',100),
    ('form-video/${trainee}/standalone.mp4','${trainee}','form-video','video/mp4',100),
    ('coach-image/${coach}/avatar.png','${coach}','coach-image','image/png',100),
    ('form-video/${trainee}/unattached.mp4','${trainee}','form-video','video/mp4',100)`);
  // Entitlement fixtures model already server-verified objects. Actual byte and
  // pending/ready validation are covered by the separate finalization tests.
  await db.exec(`SELECT public.mark_media_ready(object_key,'sealed/'||encode(sha256(convert_to(object_key,'UTF8')),'hex'),
    declared_size_bytes::bigint,content_type,'"fixture"') FROM public.media_objects`);
  await db.query("INSERT INTO form_checks(id,client_id,video_key) VALUES ($1,$2,$3)", [id(22), trainee, `form-video/${trainee}/standalone.mp4`]);
  await db.query('UPDATE set_logs SET form_video_s3_key=$1 WHERE id=$2', [`form-video/${trainee}/set.mp4`, id(21)]);
  await db.query('UPDATE profiles SET avatar_key=$1 WHERE id=$2', [`coach-image/${coach}/avatar.png`, coach]);
  await db.exec('ALTER TABLE form_checks DISABLE TRIGGER check_form_media_owner');
  await db.query("INSERT INTO form_checks(id,client_id,video_key) VALUES ($1,$2,$3)", [id(23), trainee, `form-video/${trainee}/legacy.mp4`]);
  await db.exec('ALTER TABLE form_checks ENABLE TRIGGER check_form_media_owner');
}, { timeout: 90000 });
after(async () => { await db?.close(); });

test('only the owner and current coach can view registered attached media; reassignment revokes former coach', async () => {
  const setKey = `form-video/${trainee}/set.mp4`, standaloneKey = `form-video/${trainee}/standalone.mp4`, avatar = `coach-image/${coach}/avatar.png`;
  for (const key of [setKey, standaloneKey]) {
    assert.equal((await asUser(trainee, () => rows('SELECT can_view_media($1) AS allowed', [key])))[0].allowed, true);
    assert.equal((await asUser(coach, () => rows('SELECT can_view_media($1) AS allowed', [key])))[0].allowed, true);
    assert.equal((await asUser(otherCoach, () => rows('SELECT can_view_media($1) AS allowed', [key])))[0].allowed, false);
    assert.equal((await asUser(unrelated, () => rows('SELECT can_view_media($1) AS allowed', [key])))[0].allowed, false);
  }
  assert.equal((await asUser(coach, () => rows('SELECT can_view_media($1) AS allowed', [avatar])))[0].allowed, true);
  assert.equal((await asUser(otherCoach, () => rows('SELECT can_view_media($1) AS allowed', [avatar])))[0].allowed, false);
  await db.query('UPDATE profiles SET coach_id=$1 WHERE id=$2', [nextCoach, trainee]);
  assert.equal((await asUser(coach, () => rows('SELECT can_view_media($1) AS allowed', [standaloneKey])))[0].allowed, false);
  assert.equal((await asUser(nextCoach, () => rows('SELECT can_view_media($1) AS allowed', [standaloneKey])))[0].allowed, true);
  assert.equal((await asUser(coach, () => rows('SELECT id FROM form_checks WHERE id=$1', [id(22)]))).length, 0);
  assert.equal((await asUser(nextCoach, () => rows('SELECT id FROM form_checks WHERE id=$1', [id(22)]))).length, 1);
});

test('an owner reference cannot claim a registered foreign object or unlock an unregistered legacy key', async () => {
  const knownForeign = `form-video/${trainee}/set.mp4`, legacy = `form-video/${trainee}/legacy.mp4`;
  await asUser(trainee, async () => {
    await db.query("INSERT INTO workout_sessions(id,user_id,session_name,duration_seconds) VALUES ($1,$2,'New',60)", [id(31), trainee]);
    await assert.rejects(db.query('UPDATE profiles SET avatar_key=$1 WHERE id=$2', [`coach-image/${coach}/avatar.png`, trainee]), /Media is unregistered or unavailable/);
    await assert.rejects(db.query('UPDATE set_logs SET form_video_s3_key=$1 WHERE id=$2', [legacy, id(21)]), /Media is unregistered or unavailable/);
    // An unchanged historical form-check reference remains readable as data only.
    await db.query('UPDATE form_checks SET status=\'reviewed\' WHERE id=$1', [id(23)]);
  });
  await db.query("INSERT INTO workout_sessions(id,user_id,session_name,duration_seconds) VALUES ($1,$2,'Foreign',60)", [id(34), unrelated]);
  await asUser(unrelated, () => assert.rejects(db.query('INSERT INTO set_logs(id,session_id,exercise_id,set_number,weight_kg,reps,form_video_s3_key) VALUES ($1,$2,$3,1,1,1,$4)', [id(35), id(34), exercise, knownForeign]), /Media is unregistered or unavailable/));
  assert.equal((await asUser(trainee, () => rows('SELECT video_key FROM form_checks WHERE id=$1', [id(23)])))[0].video_key, legacy);
  assert.equal((await asUser(trainee, () => rows('SELECT can_view_media($1) AS allowed', [legacy])))[0].allowed, false);
});

test('registry writes are service-only and media attachment kinds and owners are checked', async () => {
  await asUser(trainee, async () => {
    await assert.rejects(db.query("INSERT INTO media_objects(object_key,owner_id,kind,content_type,declared_size_bytes) VALUES ($1,$2,'form-video','video/mp4',1)", [`form-video/${trainee}/forged.mp4`, trainee]), /permission denied/);
    await assert.rejects(db.query('SELECT * FROM media_objects'), /permission denied/);
    await assert.rejects(db.query('UPDATE set_logs SET form_video_s3_key=$1 WHERE id=$2', [`coach-image/${coach}/avatar.png`, id(21)]), /Media is unregistered or unavailable/);
  });
  await asUser(null, () => db.query('SELECT can_view_media($1)', [`form-video/${trainee}/set.mp4`]), 'anon').then(() => assert.fail('anonymous execute must be denied'), () => {});
});
