import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createSchema } from '../../scripts/schema.mjs';

// Reserved for the coordinated SQL verification slot. This file is intentionally
// independent of contracts.test.mjs, which has pre-existing concurrent edits.
let db;
const id = (n) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const coach = id(1), otherCoach = id(2), trainee = id(3), exercise = id(10);
async function asUser(user, action, role = 'authenticated') {
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [user ?? '']);
  await db.exec(`SET ROLE ${role}`);
  try { return await action(); } finally { await db.exec('RESET ROLE'); }
}
const item = (position = 1, patch = {}) => ({ exercise_id: exercise, position, target_sets: 3,
  target_reps: 8, target_rpe: null, rest_seconds: 0, ...patch });
const save = (operation, template, items = [item()], owner = coach, name = ' Private workout ') =>
  db.query('SELECT save_workout_template($1,$2,$3,$4,$5,$6::jsonb) AS id',
    [operation, template, owner, name, ' Description ', JSON.stringify(items)]);
const rows = async (sql, args = []) => (await db.query(sql, args)).rows;
before(async () => {
  db = await createSchema();
  await db.exec("INSERT INTO coach_allowlist(email) VALUES ('private-author@test.invalid'), ('private-other@test.invalid')");
  for (const [uid, email] of [[coach, 'private-author'], [otherCoach, 'private-other'], [trainee, 'private-trainee']]) {
    await db.query('INSERT INTO auth.users(id,email) VALUES ($1,$2)', [uid, `${email}@test.invalid`]);
  }
  await db.query("INSERT INTO exercises(id,name,target_muscle_group) VALUES ($1,'Squat','Quads')", [exercise]);
}, { timeout: 30000 });
after(async () => { await db?.close(); });

test('private save commits exact ordered prescriptions, repeated exercises and one replay result', async () => {
  const operation = id(20), template = id(21);
  const items = [item(), item(2, { target_sets: 5, target_reps: 12, target_rpe: 9, rest_seconds: 120 })];
  await asUser(coach, async () => {
    assert.equal((await save(operation, template, items)).rows[0].id, template);
    assert.equal((await save(operation, template, items)).rows[0].id, template);
    const parent = await rows('SELECT name,description,creator_id,scope,assigned_trainee_id FROM workout_templates WHERE id=$1', [template]);
    assert.deepEqual(parent, [{ name: 'Private workout', description: 'Description', creator_id: coach, scope: 'PRIVATE', assigned_trainee_id: null }]);
    const stored = await rows('SELECT exercise_id,position,target_sets,target_reps,target_rpe,rest_seconds FROM template_items WHERE template_id=$1 ORDER BY position', [template]);
    assert.deepEqual(stored, items);
    await assert.rejects(save(operation, template, [item(1, { target_reps: 9 })]), /different ownership or content/);
    await assert.rejects(save(id(22), template, items), /cannot overwrite/);
    assert.deepEqual(await rows('SELECT exercise_id,position,target_sets,target_reps,target_rpe,rest_seconds FROM template_items WHERE template_id=$1 ORDER BY position', [template]), items);
  });
  await asUser(otherCoach, async () => {
    assert.equal((await rows('SELECT id FROM workout_templates WHERE id=$1', [template])).length, 0);
    await assert.rejects(save(operation, template, items, otherCoach), /different ownership or content/);
    await assert.rejects(save(id(23), template, items, otherCoach), /cannot overwrite/);
  });
  await asUser(trainee, async () => assert.equal((await rows('SELECT id FROM template_items WHERE template_id=$1', [template])).length, 0));
});

test('a failed item insert rolls back parent, all children and receipt; same IDs can recover', async () => {
  const operation = id(30), template = id(31);
  await asUser(coach, async () => {
    await assert.rejects(save(operation, template, [item(), item(2, { exercise_id: id(999) })]), /foreign key/);
    assert.equal((await rows('SELECT id FROM workout_templates WHERE id=$1', [template])).length, 0);
    assert.equal((await rows('SELECT id FROM template_items WHERE template_id=$1', [template])).length, 0);
    assert.equal((await save(operation, template, [item(), item(2)])).rows[0].id, template);
  });
  assert.equal((await rows('SELECT operation_id FROM workout_template_save_operations WHERE operation_id=$1', [operation])).length, 1);
});

test('server rejects invalid prescriptions, forged ownership, trainees and anonymous callers', async () => {
  await asUser(coach, async () => {
    for (const items of [[], [item(2)], [item(1, { target_sets: null })], [item(1, { target_reps: 1.5 })],
      [item(1, { target_rpe: 11 })], [item(1, { rest_seconds: -1 })]]) {
      await assert.rejects(save(id(40), id(41), items));
    }
    await assert.rejects(save(id(40), id(41), [item()], otherCoach), /authenticated coach/);
    await assert.rejects(save(id(40), id(41), [item()], coach, '   '), /name/);
    assert.equal((await rows('SELECT id FROM workout_templates WHERE id=$1', [id(41)])).length, 0);
    await assert.rejects(db.query('INSERT INTO workout_template_save_operations VALUES ($1,$2,$3,$4)', [id(40), id(41), coach, '{}']), /permission denied/);
    await assert.rejects(db.query('SELECT * FROM workout_template_save_operations'), /permission denied/);
    await assert.rejects(db.query('UPDATE workout_template_save_operations SET request=$1', ['{}']), /permission denied/);
    await assert.rejects(db.query('DELETE FROM workout_template_save_operations'), /permission denied/);
  });
  await asUser(trainee, () => assert.rejects(save(id(40), id(41), [item()], trainee), /authenticated coach/));
  await asUser(null, () => assert.rejects(save(id(40), id(41)), /permission denied/), 'anon');
});

test('a receipt cannot recreate a deleted template or be rebound to a different template', async () => {
  const operation = id(60), template = id(61);
  await asUser(coach, async () => {
    await save(operation, template);
    await assert.rejects(save(operation, id(62)), /different ownership or content/);
    await db.query('DELETE FROM workout_templates WHERE id=$1', [template]);
    await assert.rejects(save(operation, template), /no longer available/);
    await assert.rejects(save(id(63), template), /cannot overwrite/);
    assert.equal((await rows('SELECT id FROM workout_templates WHERE id=$1', [template])).length, 0);
  });
  assert.equal((await rows('SELECT operation_id FROM workout_template_save_operations WHERE operation_id=$1', [operation])).length, 1);
});

test('existing owned templates cannot be overwritten, and personal templates/logs remain independent', async () => {
  const template = id(50), session = id(51);
  await asUser(trainee, () => db.query("INSERT INTO workout_templates(id,creator_id,name) VALUES ($1,$2,'Personal')", [template, trainee]));
  await asUser(coach, () => assert.rejects(save(id(52), template), /cannot overwrite/));
  await asUser(trainee, async () => {
    await db.query('SELECT sync_workout_session($1::jsonb)', [JSON.stringify({ id: session, user_id: trainee, template_id: template, session_name: 'Historical', duration_seconds: 60 })]);
    await db.query('INSERT INTO set_logs(id,session_id,exercise_id,set_number,weight_kg,reps) VALUES ($1,$2,$3,1,42.5,7)', [id(53), session, exercise]);
  });
  await asUser(coach, () => save(id(54), id(55)));
  await asUser(trainee, async () => {
    assert.equal((await rows('SELECT name FROM workout_templates WHERE id=$1', [template]))[0].name, 'Personal');
    const logs = await rows('SELECT weight_kg::text AS weight,reps FROM set_logs WHERE session_id=$1', [session]);
    assert.equal(Number(logs[0].weight), 42.5); assert.equal(logs[0].reps, 7);
  });
});
